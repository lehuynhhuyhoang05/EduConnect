import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMaterialDto {
  @ApiProperty({ description: 'Tiêu đề tài liệu', example: 'Slide Bài 1' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'Mô tả tài liệu' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateMaterialDto {
  @ApiPropertyOptional({ description: 'Tiêu đề tài liệu' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: 'Mô tả tài liệu' })
  @IsString()
  @IsOptional()
  description?: string;
}

export class QueryMaterialDto {
  @ApiPropertyOptional({ description: 'Loại file', example: 'pdf' })
  @IsString()
  @IsOptional()
  fileType?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo tên', example: 'slide' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Trang', default: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Số lượng mỗi trang', default: 20 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number;
}
