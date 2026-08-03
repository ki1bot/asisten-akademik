import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @Transform(({ value }) => String(value).trim().toLowerCase())
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/[A-Z]/, {
    message: 'Password harus memiliki huruf besar',
  })
  @Matches(/[a-z]/, {
    message: 'Password harus memiliki huruf kecil',
  })
  @Matches(/[0-9]/, {
    message: 'Password harus memiliki angka',
  })
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;
}

export class LoginDto {
  @Transform(({ value }) => String(value).trim().toLowerCase())
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @Transform(({ value }) => String(value).trim().toLowerCase())
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/[A-Z]/, {
    message: 'Password harus memiliki huruf besar',
  })
  @Matches(/[a-z]/, {
    message: 'Password harus memiliki huruf kecil',
  })
  @Matches(/[0-9]/, {
    message: 'Password harus memiliki angka',
  })
  password!: string;
}

export class VerifyEmailDto {
  @IsString()
  token!: string;
}
