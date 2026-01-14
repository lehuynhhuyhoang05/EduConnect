import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { UserRole } from '@modules/users/entities/user.entity';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address (unique)',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @MaxLength(255)
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Password (min 8 chars, must contain uppercase, lowercase, number)',
  })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @MaxLength(100)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Mật khẩu phải chứa chữ hoa, chữ thường và số',
  })
  password: string;

  @ApiProperty({
    example: 'Nguyen Van A',
    description: 'User full name (max 100 chars)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Họ tên không được để trống' })
  @MaxLength(100)
  fullName: string;

  @ApiProperty({
    example: 'STUDENT',
    enum: UserRole,
    description: 'User role: STUDENT, TEACHER, or ADMIN',
    required: false,
    default: 'STUDENT',
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Role phải là STUDENT, TEACHER hoặc ADMIN' })
  role?: UserRole;
}
