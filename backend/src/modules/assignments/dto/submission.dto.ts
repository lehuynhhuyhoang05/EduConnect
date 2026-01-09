import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  MaxLength,
  Min,
  Max,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';

export class CreateSubmissionDto {
  @ApiProperty({ example: '/uploads/submission-file.pdf', required: false })
  @ValidateIf((o) => !o.content)
  @IsNotEmpty({ message: 'Phải có file hoặc nội dung bài làm' })
  @IsString()
  @MaxLength(500)
  fileUrl?: string;

  @ApiProperty({ example: 'myfile.pdf', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  originalFileName?: string;

  @ApiProperty({ example: 'Nội dung bài làm của sinh viên...', required: false })
  @ValidateIf((o) => !o.fileUrl)
  @IsNotEmpty({ message: 'Phải có file hoặc nội dung bài làm' })
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
