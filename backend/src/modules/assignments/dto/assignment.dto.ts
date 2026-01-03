import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreateAssignmentDto {
  @ApiProperty({ example: 'Bài tập Chương 1: Giới thiệu' })
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'Hoàn thành các bài tập từ 1-10 trong sách giáo khoa', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-01-15T23:59:59.000Z' })
  @IsDateString({}, { message: 'Hạn nộp không hợp lệ' })
  dueDate: string;

  @ApiProperty({ example: 100, required: false, default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  maxScore?: number;

  @ApiProperty({ example: '/uploads/assignment-file.pdf', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  attachmentUrl?: string;
}

export class UpdateAssignmentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  maxScore?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  attachmentUrl?: string;
}
