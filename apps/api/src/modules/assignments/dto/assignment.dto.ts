import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  AssignmentPriority,
  AssignmentStatus,
} from '../../../generated/prisma/client';

export class CreateAssignmentDto {
  @IsUUID()
  courseId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @Type(() => Date)
  @IsDate()
  deadline!: Date;

  @IsOptional()
  @IsEnum(AssignmentPriority)
  priority?: AssignmentPriority;

  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @IsOptional()
  @IsUrl()
  attachmentUrl?: string | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  reminderAt?: Date | null;
}

export class UpdateAssignmentDto extends PartialType(CreateAssignmentDto) {}

export class AssignmentQueryDto {
  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsEnum(AssignmentStatus)
  status?: AssignmentStatus;

  @IsOptional()
  @IsEnum(AssignmentPriority)
  priority?: AssignmentPriority;
}
