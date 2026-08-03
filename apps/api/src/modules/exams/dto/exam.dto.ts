import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ExamType } from '../../../generated/prisma/client';

export class CreateExamDto {
  @IsUUID()
  courseId!: string;

  @IsEnum(ExamType)
  type!: ExamType;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @Type(() => Date)
  @IsDate()
  examDate!: Date;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endTime?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  room?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  topics?: string | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  reminderAt?: Date | null;
}

export class UpdateExamDto extends PartialType(CreateExamDto) {}

export class ExamQueryDto {
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsEnum(ExamType)
  type?: ExamType;
}
