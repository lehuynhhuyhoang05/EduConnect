import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsArray, IsNumber } from 'class-validator';
import { UserRole } from '@modules/users/entities/user.entity';

export class UpdateUserStatusDto {
  @ApiProperty({ description: 'User active status' })
  @IsBoolean()
  isActive: boolean;
}

export class UpdateUserRoleDto {
  @ApiProperty({ description: 'User role', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;
}

export class BulkUpdateUsersDto {
  @ApiProperty({ description: 'Array of user IDs to update' })
  @IsArray()
  @IsNumber({}, { each: true })
  userIds: number[];

  @ApiProperty({ description: 'Set active status', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ description: 'Set role', enum: UserRole, required: false })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
