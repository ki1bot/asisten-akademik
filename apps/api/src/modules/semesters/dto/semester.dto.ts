import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SemesterType } from '../../../generated/prisma/client';

export class CreateSemesterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name!: string;

  @IsString()
  @Matches(/^\d{4}\/\d{4}$/, {
    message: 'Tahun akademik harus menggunakan format 2026/2027',
  })
  academicYear!: string;

  @IsEnum(SemesterType)
  type!: SemesterType;

  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @Type(() => Date)
  @IsDate()
  endDate!: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSemesterDto extends PartialType(CreateSemesterDto) {}
