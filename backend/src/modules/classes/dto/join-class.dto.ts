import { IsString, Length, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinClassDto {
  @ApiProperty({
    description: 'Mã lớp học (6 ký tự)',
    example: 'ABC123',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'Mã lớp không được để trống' })
  @Length(6, 6, { message: 'Mã lớp phải có đúng 6 ký tự' })
  classCode: string;
}
