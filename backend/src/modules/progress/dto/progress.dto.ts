import { IsEnum, IsNumber, IsOptional, IsString, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ActivityType } from '../entities/progress.entity';

export class LogActivityDto {
  @ApiProperty({ enum: ActivityType })
  @IsEnum(ActivityType)
  activityType: ActivityType;

  @ApiPropertyOptional({ description: 'Class ID' })
  @IsOptional()
  @IsNumber()
  classId?: number;

  @ApiPropertyOptional({ description: 'Resource ID (material, assignment, session)' })
  @IsOptional()
  @IsNumber()
  resourceId?: number;

  @ApiPropertyOptional({ description: 'Resource title' })
  @IsOptional()
  @IsString()
  resourceTitle?: string;

  @ApiPropertyOptional({ description: 'Duration in seconds' })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
