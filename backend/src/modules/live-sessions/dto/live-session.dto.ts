import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  IsBoolean,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class CreateLiveSessionDto {
  @ApiProperty({ example: 'Buổi học Chương 5: WebRTC' })
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'Học về WebRTC signaling và peer connection', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2026-01-10T09:00:00.000Z', required: false })
  @IsOptional()
  @IsDateString({}, { message: 'Thời gian dự kiến không hợp lệ' })
  scheduledAt?: string;

  @ApiProperty({ example: 20, required: false, default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(100)
  maxParticipants?: number;

  @ApiProperty({ example: false, required: false, default: false })
  @IsOptional()
  @IsBoolean()
  waitingRoomEnabled?: boolean;
}

export class UpdateLiveSessionDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(100)
  maxParticipants?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  recordingUrl?: string;
}

export class StartSessionDto {
  @ApiProperty({ example: true, description: 'Bắt đầu ngay lập tức' })
  @IsOptional()
  immediate?: boolean;
}
