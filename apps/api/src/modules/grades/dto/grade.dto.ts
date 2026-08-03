import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class GradeComponentDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  @Max(100)
  score!: number;

  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0.01)
  @Max(100)
  weight!: number;
}

export class CreateGradeDto {
  @IsUUID()
  courseId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  @Max(100)
  finalScore?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({
    each: true,
  })
  @Type(() => GradeComponentDto)
  components?: GradeComponentDto[];
}

export class UpdateGradeDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber({
    maxDecimalPlaces: 2,
  })
  @Min(0)
  @Max(100)
  finalScore?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({
    each: true,
  })
  @Type(() => GradeComponentDto)
  components?: GradeComponentDto[];
}

export class GradeQueryDto {
  @IsOptional()
  @IsUUID()
  semesterId?: string;
}
