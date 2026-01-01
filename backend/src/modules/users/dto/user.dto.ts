import { ApiProperty, PartialType } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsBoolean,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  password: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  @IsString()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ enum: UserRole, required: false, default: 'STUDENT' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

export class UpdateUserDto {
  @ApiProperty({ example: 'Nguyen Van B', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @ApiProperty({ description: 'Is user active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Is user verified', required: false })
  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;
}

export class QueryUserDto {
  @ApiProperty({ required: false, description: 'Search by email or name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ enum: UserRole, required: false })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ required: false, description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiProperty({ required: false, default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;
}
