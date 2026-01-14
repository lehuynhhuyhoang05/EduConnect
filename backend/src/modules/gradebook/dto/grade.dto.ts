import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, IsDateString, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GradeCategory } from '../entities/grade.entity';

export class CreateGradeItemDto {
  @ApiProperty({ description: 'Grade item name', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: GradeCategory, default: GradeCategory.OTHER })
  @IsEnum(GradeCategory)
  category: GradeCategory;

  @ApiPropertyOptional({ description: 'Maximum score', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  maxScore?: number;

  @ApiPropertyOptional({ description: 'Weight in final grade', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  weight?: number;

  @ApiProperty({ description: 'Class ID' })
  @IsNumber()
  classId: number;

  @ApiPropertyOptional({ description: 'Due date' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ description: 'Related assignment ID' })
  @IsOptional()
  @IsNumber()
  relatedAssignmentId?: number;
}

export class UpdateGradeEntryDto {
  @ApiProperty({ description: 'Score' })
  @IsNumber()
  @Min(0)
  score: number;

  @ApiPropertyOptional({ description: 'Feedback' })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiPropertyOptional({ description: 'Mark as excused', default: false })
  @IsOptional()
  @IsBoolean()
  isExcused?: boolean;
}

export class BulkUpdateGradesDto {
  @ApiProperty({ description: 'Grade item ID' })
  @IsNumber()
  gradeItemId: number;

  @ApiProperty({ description: 'Array of student grades' })
  grades: Array<{
    studentId: number;
    score: number;
    feedback?: string;
    isExcused?: boolean;
  }>;
}
