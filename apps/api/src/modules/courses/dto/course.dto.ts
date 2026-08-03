import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsHexColor,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCourseDto {
  @IsUUID()
  semesterId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(20)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  credits!: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  lecturer?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  room?: string | null;

  @IsHexColor()
  color!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

export class CourseQueryDto {
  @IsOptional()
  @IsUUID()
  semesterId?: string;
}
