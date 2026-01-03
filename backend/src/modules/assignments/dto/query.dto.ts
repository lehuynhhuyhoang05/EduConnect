import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsEnum, IsBoolean, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SubmissionStatus } from '../entities';

export class QueryAssignmentDto {
  @ApiProperty({ required: false, description: 'Filter by class ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  classId?: number;

  @ApiProperty({ required: false, description: 'Filter active/inactive' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;
}

export class QuerySubmissionDto {
  @ApiProperty({ required: false, description: 'Filter by status' })
  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;
}
