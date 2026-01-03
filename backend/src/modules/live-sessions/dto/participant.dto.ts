import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ConnectionQuality } from '../entities';

export class UpdateConnectionQualityDto {
  @ApiProperty({ enum: ConnectionQuality })
  @IsEnum(ConnectionQuality)
  quality: ConnectionQuality;
}

export class JoinSessionDto {
  @ApiProperty({ example: 'abc-123-def', required: false, description: 'Socket ID for WebRTC signaling' })
  @IsOptional()
  socketId?: string;
}
