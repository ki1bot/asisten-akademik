import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LectureType } from '../../../generated/prisma/client';

export class CreateScheduleDto {
  @IsUUID()
  courseId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek!: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Jam mulai harus menggunakan format HH:mm',
  })
  startTime!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Jam selesai harus menggunakan format HH:mm',
  })
  endTime!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  room?: string | null;

  @IsEnum(LectureType)
  lectureType!: LectureType;

  @IsOptional()
  @IsUrl()
  onlineUrl?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10080)
  reminderMinutes?: number | null;
}

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {}

export class ScheduleQueryDto {
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek?: number;
}
