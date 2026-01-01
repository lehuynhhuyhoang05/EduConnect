import { PartialType } from '@nestjs/swagger';
import { CreateClassDto } from './create-class.dto';
import { IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateClassDto extends PartialType(CreateClassDto) {
  @ApiPropertyOptional({
    description: 'Trạng thái hoạt động của lớp',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
