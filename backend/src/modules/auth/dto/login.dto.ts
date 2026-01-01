import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @MaxLength(255)
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'User password',
  })
  @IsString()
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @MaxLength(100)
  password: string;
}
