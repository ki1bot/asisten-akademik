import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { AuthUser } from '../../common/types/auth-user.type';
import { assertOwnedResource } from '../../common/utils/ownership.util';
import { PrismaService } from '../../database/prisma.service';
import { CreateSemesterDto, UpdateSemesterDto } from './dto/semester.dto';

@Injectable()
export class SemestersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: AuthUser) {
    return this.prisma.semester.findMany({
      where: {
        userId: user.userId,
      },
      include: {
        _count: {
          select: {
            courses: true,
          },
        },
      },
      orderBy: [
        {
          isActive: 'desc',
        },
        {
          startDate: 'desc',
        },
      ],
    });
  }

  async findOne(user: AuthUser, id: string) {
    const semester = await this.prisma.semester.findFirst({
      where: {
        id,
        userId: user.userId,
      },
      include: {
        courses: {
          orderBy: {
            name: 'asc',
          },
        },
        _count: {
          select: {
            courses: true,
          },
        },
      },
    });

    return assertOwnedResource(semester, user.userId, 'Semester');
  }

  async create(user: AuthUser, dto: CreateSemesterDto) {
    this.validateDates(dto.startDate, dto.endDate);

    await this.ensureUnique(user.userId, dto.name, dto.academicYear);

    if (dto.isActive) {
      return this.prisma.$transaction(async (transaction) => {
        await transaction.semester.updateMany({
          where: {
            userId: user.userId,
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });

        return transaction.semester.create({
          data: {
            userId: user.userId,
            name: dto.name.trim(),
            academicYear: dto.academicYear,
            type: dto.type,
            startDate: dto.startDate,
            endDate: dto.endDate,
            isActive: true,
          },
        });
      });
    }

    return this.prisma.semester.create({
      data: {
        userId: user.userId,
        name: dto.name.trim(),
        academicYear: dto.academicYear,
        type: dto.type,
        startDate: dto.startDate,
        endDate: dto.endDate,
        isActive: false,
      },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateSemesterDto) {
    const semester = await this.prisma.semester.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    const ownedSemester = assertOwnedResource(
      semester,
      user.userId,
      'Semester',
    );

    const name = dto.name?.trim() ?? ownedSemester.name;
    const academicYear = dto.academicYear ?? ownedSemester.academicYear;
    const startDate = dto.startDate ?? ownedSemester.startDate;
    const endDate = dto.endDate ?? ownedSemester.endDate;

    this.validateDates(startDate, endDate);

    await this.ensureUnique(user.userId, name, academicYear, id);

    if (dto.isActive === true) {
      return this.prisma.$transaction(async (transaction) => {
        await transaction.semester.updateMany({
          where: {
            userId: user.userId,
            id: {
              not: id,
            },
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });

        return transaction.semester.update({
          where: {
            id,
          },
          data: {
            ...dto,
            name,
            academicYear,
            startDate,
            endDate,
            isActive: true,
          },
        });
      });
    }

    return this.prisma.semester.update({
      where: {
        id,
      },
      data: {
        ...dto,
        name,
        academicYear,
        startDate,
        endDate,
      },
    });
  }

  async remove(user: AuthUser, id: string) {
    const semester = await this.prisma.semester.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    assertOwnedResource(semester, user.userId, 'Semester');

    await this.prisma.semester.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Semester berhasil dihapus',
    };
  }

  private validateDates(startDate: Date, endDate: Date): void {
    if (startDate >= endDate) {
      throw new BadRequestException(
        'Tanggal selesai semester harus setelah tanggal mulai',
      );
    }
  }

  private async ensureUnique(
    userId: string,
    name: string,
    academicYear: string,
    ignoredId?: string,
  ): Promise<void> {
    const semester = await this.prisma.semester.findFirst({
      where: {
        userId,
        name,
        academicYear,
        ...(ignoredId
          ? {
              id: {
                not: ignoredId,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    if (semester) {
      throw new ConflictException(
        'Semester dengan nama dan tahun akademik tersebut sudah tersedia',
      );
    }
  }
}
