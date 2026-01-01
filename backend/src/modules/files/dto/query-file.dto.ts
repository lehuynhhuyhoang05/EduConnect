import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min, IsEnum } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum FileType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio',
  OTHER = 'other',
}

export class QueryFileDto {
  @ApiPropertyOptional({ description: 'Lọc theo loại file' })
  @IsOptional()
  @IsEnum(FileType)
  type?: FileType;

  @ApiPropertyOptional({ description: 'Lọc theo người upload' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  uploadedBy?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
