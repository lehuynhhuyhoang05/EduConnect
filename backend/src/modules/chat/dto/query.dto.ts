import { IsOptional, IsInt, Min, Max, IsEnum, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { RoomType } from '../entities/chat-message.entity';

export class QueryMessagesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  before?: number; // Get messages before this ID (for infinite scroll)

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  after?: number; // Get messages after this ID (for real-time updates)

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeDeleted?: boolean = false;
}

export class RoomQueryDto {
  @IsOptional()
  @IsEnum(RoomType)
  type?: RoomType;
}
