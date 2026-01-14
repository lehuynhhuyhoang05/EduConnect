import { IsNumber, IsArray, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitResponseDto {
  @ApiProperty({ description: 'Poll ID' })
  @IsNumber()
  pollId: number;

  @ApiPropertyOptional({ description: 'Selected option indexes (for choice questions)' })
  @IsOptional()
  @IsArray()
  selectedOptions?: number[];

  @ApiPropertyOptional({ description: 'Text answer (for short answer questions)' })
  @IsOptional()
  @IsString()
  textAnswer?: string;
}
