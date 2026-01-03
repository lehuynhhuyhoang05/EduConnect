import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreateSubmissionDto {
  @ApiProperty({ example: '/uploads/submission-file.pdf', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  fileUrl?: string;

  @ApiProperty({ example: 'Nội dung bài làm của sinh viên...', required: false })
  @IsOptional()
  @IsString()
  content?: string;
}

export class GradeSubmissionDto {
  @ApiProperty({ example: 85.5, description: 'Điểm số' })
  @IsNumber()
  @Min(0)
  @Max(1000)
  score: number;

  @ApiProperty({ example: 'Bài làm tốt, cần cải thiện phần trình bày', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string;
}

export class ReturnSubmissionDto {
  @ApiProperty({ example: 'Vui lòng nộp lại với định dạng PDF' })
  @IsString()
  @MaxLength(2000)
  feedback: string;
}
