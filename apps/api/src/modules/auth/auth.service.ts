import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';
import { AuthUser } from '../../common/types/auth-user.type';
import { PrismaService } from '../../database/prisma.service';
import { Role } from '../../generated/prisma/client';
import {
  ForgotPasswordDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto';

interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface RefreshPayload {
  sub: string;
  sessionId: string;
  type: 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto, metadata: RequestMetadata) {
    const existing = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (existing) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        profile: {
          create: {
            name: dto.name.trim(),
          },
        },
        notifications: {
          create: {
            type: 'SYSTEM',
            title: 'Selamat datang di KampusHub',
            message:
              'Akun Anda siap digunakan untuk mengatur aktivitas akademik.',
          },
        },
      },
      include: {
        profile: true,
      },
    });

    const verificationToken = await this.createVerificationToken(user.id);

    const tokens = await this.createSessionAndTokens(
      user.id,
      user.email,
      user.role,
      dto.deviceName,
      metadata,
    );

    return {
      user: this.toPublicUser(user),
      ...tokens,
      ...(this.config.get<string>('NODE_ENV') !== 'production'
        ? {
            verificationToken,
          }
        : {}),
    };
  }

  async login(dto: LoginDto, metadata: RequestMetadata) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
      include: {
        profile: true,
      },
    });

    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const tokens = await this.createSessionAndTokens(
      user.id,
      user.email,
      user.role,
      dto.deviceName,
      metadata,
    );

    return {
      user: this.toPublicUser(user),
      ...tokens,
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<TokenPair> {
    const secret = this.requireConfig('JWT_REFRESH_SECRET');

    let payload: RefreshPayload;

    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(dto.refreshToken, {
        secret,
      });
    } catch {
      throw new UnauthorizedException(
        'Refresh token tidak valid atau kedaluwarsa',
      );
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Jenis token tidak valid');
    }

    const session = await this.prisma.session.findUnique({
      where: {
        id: payload.sessionId,
      },
      include: {
        user: true,
      },
    });

    if (
      !session ||
      session.userId !== payload.sub ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException(
        'Sesi tidak ditemukan atau sudah berakhir',
      );
    }

    const matches = await argon2.verify(
      session.refreshTokenHash,
      dto.refreshToken,
    );

    if (!matches) {
      await this.prisma.session.deleteMany({
        where: {
          userId: payload.sub,
        },
      });

      throw new UnauthorizedException('Refresh token sudah tidak berlaku');
    }

    const tokens = await this.issueTokens(
      session.user.id,
      session.user.email,
      session.user.role,
      session.id,
    );

    await this.prisma.session.update({
      where: {
        id: session.id,
      },
      data: {
        refreshTokenHash: await argon2.hash(tokens.refreshToken),
        expiresAt: this.refreshExpiryDate(),
        lastUsedAt: new Date(),
      },
    });

    return tokens;
  }

  async logout(user: AuthUser): Promise<{ message: string }> {
    await this.prisma.session.deleteMany({
      where: {
        id: user.sessionId,
        userId: user.userId,
      },
    });

    return {
      message: 'Berhasil logout',
    };
  }

  async logoutAll(user: AuthUser): Promise<{ message: string }> {
    await this.prisma.session.deleteMany({
      where: {
        userId: user.userId,
      },
    });

    return {
      message: 'Semua sesi berhasil dihentikan',
    };
  }

  async me(user: AuthUser) {
    const found = await this.prisma.user.findUnique({
      where: {
        id: user.userId,
      },
      include: {
        profile: true,
      },
    });

    if (!found) {
      throw new UnauthorizedException('Akun tidak ditemukan');
    }

    return this.toPublicUser(found);
  }

  async sessions(user: AuthUser) {
    return this.prisma.session.findMany({
      where: {
        userId: user.userId,
      },
      select: {
        id: true,
        deviceName: true,
        ipAddress: true,
        userAgent: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: {
        lastUsedAt: 'desc',
      },
    });
  }

  async revokeSession(
    user: AuthUser,
    sessionId: string,
  ): Promise<{ message: string }> {
    const result = await this.prisma.session.deleteMany({
      where: {
        id: sessionId,
        userId: user.userId,
      },
    });

    if (!result.count) {
      throw new BadRequestException('Sesi tidak ditemukan');
    }

    return {
      message: 'Sesi berhasil dihentikan',
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) {
      return {
        message: 'Jika email terdaftar, instruksi reset password akan dikirim',
      };
    }

    const rawToken = randomBytes(32).toString('hex');

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    return {
      message: 'Jika email terdaftar, instruksi reset password akan dikirim',
      ...(this.config.get<string>('NODE_ENV') !== 'production'
        ? {
            resetToken: rawToken,
          }
        : {}),
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    const token = await this.prisma.passwordResetToken.findUnique({
      where: {
        tokenHash: this.hashToken(dto.token),
      },
    });

    if (!token || token.usedAt || token.expiresAt <= new Date()) {
      throw new BadRequestException(
        'Token reset password tidak valid atau kedaluwarsa',
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: token.userId,
        },
        data: {
          passwordHash: await argon2.hash(dto.password),
        },
      }),
      this.prisma.passwordResetToken.update({
        where: {
          id: token.id,
        },
        data: {
          usedAt: new Date(),
        },
      }),
      this.prisma.session.deleteMany({
        where: {
          userId: token.userId,
        },
      }),
    ]);

    return {
      message: 'Password berhasil diperbarui. Silakan login kembali',
    };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> {
    const token = await this.prisma.verificationToken.findUnique({
      where: {
        tokenHash: this.hashToken(dto.token),
      },
    });

    if (!token || token.usedAt || token.expiresAt <= new Date()) {
      throw new BadRequestException(
        'Token verifikasi tidak valid atau kedaluwarsa',
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: token.userId,
        },
        data: {
          emailVerifiedAt: new Date(),
        },
      }),
      this.prisma.verificationToken.update({
        where: {
          id: token.id,
        },
        data: {
          usedAt: new Date(),
        },
      }),
    ]);

    return {
      message: 'Email berhasil diverifikasi',
    };
  }

  private async createVerificationToken(userId: string): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');

    await this.prisma.verificationToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(rawToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    return rawToken;
  }

  private async createSessionAndTokens(
    userId: string,
    email: string,
    role: Role,
    deviceName: string | undefined,
    metadata: RequestMetadata,
  ): Promise<TokenPair> {
    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: 'pending',
        deviceName: deviceName?.trim() || 'Perangkat tidak dikenal',
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        expiresAt: this.refreshExpiryDate(),
      },
    });

    const tokens = await this.issueTokens(userId, email, role, session.id);

    await this.prisma.session.update({
      where: {
        id: session.id,
      },
      data: {
        refreshTokenHash: await argon2.hash(tokens.refreshToken),
      },
    });

    return tokens;
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: Role,
    sessionId: string,
  ): Promise<TokenPair> {
    const accessSecret = this.requireConfig('JWT_ACCESS_SECRET');

    const refreshSecret = this.requireConfig('JWT_REFRESH_SECRET');

    const accessExpires =
      this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';

    const refreshExpires =
      this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '30d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        {
          sub: userId,
          email,
          role,
          sessionId,
          type: 'access',
        },
        {
          secret: accessSecret,
          expiresIn: accessExpires as never,
        },
      ),
      this.jwt.signAsync(
        {
          sub: userId,
          sessionId,
          type: 'refresh',
        },
        {
          secret: refreshSecret,
          expiresIn: refreshExpires as never,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private refreshExpiryDate(): Date {
    const value = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '30d';

    return new Date(Date.now() + this.parseDuration(value));
  }

  private parseDuration(value: string): number {
    const match = /^(\d+)(s|m|h|d)$/.exec(value.trim());

    if (!match) {
      return 30 * 24 * 60 * 60 * 1000;
    }

    const amount = Number(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return amount * (multipliers[unit] ?? 24 * 60 * 60 * 1000);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private requireConfig(key: string): string {
    const value = this.config.get<string>(key);

    if (!value) {
      throw new Error(`${key} belum dikonfigurasi`);
    }

    return value;
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    role: Role;
    emailVerifiedAt: Date | null;
    profile: {
      id: string;
      name: string;
      studentId: string | null;
      university: string | null;
      faculty: string | null;
      major: string | null;
      timezone: string;
    } | null;
  }) {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      emailVerifiedAt: user.emailVerifiedAt,
      profile: user.profile,
    };
  }
}
