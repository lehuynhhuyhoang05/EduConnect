import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsEnum, Min, Max, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { LiveSessionStatus } from '../entities';

export class QueryLiveSessionDto {
  @ApiProperty({ required: false, description: 'Filter by class ID' })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  classId?: number;

  @ApiProperty({ required: false, enum: LiveSessionStatus })
  @IsOptional()
  @IsEnum(LiveSessionStatus)
  status?: LiveSessionStatus;

  @ApiProperty({ required: false, description: 'Only show upcoming sessions' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  upcoming?: boolean;

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
