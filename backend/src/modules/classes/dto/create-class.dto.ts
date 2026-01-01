import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClassDto {
  @ApiProperty({
    description: 'Tên lớp học',
    example: 'Lập trình Web - K20',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty({ message: 'Tên lớp không được để trống' })
  @MinLength(3, { message: 'Tên lớp phải có ít nhất 3 ký tự' })
  @MaxLength(255, { message: 'Tên lớp không được quá 255 ký tự' })
  name: string;

  @ApiPropertyOptional({
    description: 'Mô tả lớp học',
    example: 'Lớp học về lập trình web với React và Node.js',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Môn học',
    example: 'Lập trình Web',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Tên môn học không được quá 100 ký tự' })
  subject?: string;
}
