import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
} from 'class-validator';

// ===================== JOIN ROOM =====================

export class JoinRoomDto {
  @ApiProperty({ example: 'abc-123-xyz' })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  sessionId: number;

  @ApiProperty({ example: 'Nguyễn Văn A', required: false })
  @IsOptional()
  @IsString()
  userName?: string;
}

// ===================== HAND RAISE =====================

export class RaiseHandDto {
  @ApiProperty({ example: 'abc-123-xyz' })
  @IsString()
  @IsNotEmpty()
  roomId: string;
}

export class LowerHandDto {
  @ApiProperty({ example: 'abc-123-xyz' })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({ example: 5, required: false, description: 'Host có thể hạ tay người khác' })
  @IsOptional()
  @IsNumber()
  targetUserId?: number;
}

// ===================== MUTE ALL =====================

export class MuteAllDto {
  @ApiProperty({ example: 'abc-123-xyz' })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({ example: true, description: 'true = mute, false = unmute' })
  @IsBoolean()
  mute: boolean;

  @ApiProperty({ example: true, default: true, description: 'Không mute host' })
  @IsOptional()
  @IsBoolean()
  exceptHost?: boolean;
}

// ===================== DISABLE CAMERA =====================

export class DisableCameraDto {
  @ApiProperty({ example: 'abc-123-xyz' })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  targetUserId: number;

  @ApiProperty({ example: true, description: 'true = tắt camera, false = bật lại' })
  @IsBoolean()
  disable: boolean;
}

export class DisableAllCamerasDto {
  @ApiProperty({ example: 'abc-123-xyz' })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  disable: boolean;

  @ApiProperty({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  exceptHost?: boolean;
}

// ===================== WAITING ROOM =====================

export class EnableWaitingRoomDto {
  @ApiProperty({ example: 'abc-123-xyz' })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;
}

export class AdmitUserDto {
  @ApiProperty({ example: 'abc-123-xyz' })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  targetUserId: number;
}

export class DenyUserDto {
  @ApiProperty({ example: 'abc-123-xyz' })
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({ example: 5 })
  @IsNumber()
  targetUserId: number;

  @ApiProperty({ example: 'Phiên học đã đầy', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class GetWaitingUsersDto {
  @ApiProperty({ example: 'abc-123-xyz' })
  @IsString()
  @IsNotEmpty()
  roomId: string;
}

// ===================== RESPONSE TYPES =====================

export interface HandRaisedEvent {
  userId: number;
  timestamp: string;
  order: number;
}

export interface HandLoweredEvent {
  userId: number;
  byUserId: number;
  timestamp: string;
}

export interface MuteAllTriggeredEvent {
  byHostId: number;
  mute: boolean;
  exceptHost: boolean;
  timestamp: string;
}

export interface ForceMuteEvent {
  fromHostId: number;
  mute: boolean;
  isGlobal?: boolean;
  timestamp: string;
}

export interface ForceDisableCameraEvent {
  fromHostId: number;
  disable: boolean;
  isGlobal?: boolean;
  timestamp: string;
}

export interface UserWaitingEvent {
  userId: number;
  userName?: string;
  socketId: string;
  roomId: string;
  timestamp: string;
}

export interface AdmissionGrantedEvent {
  byHostId: number;
  roomId: string;
  timestamp: string;
}

export interface AdmissionDeniedEvent {
  byHostId: number;
  reason: string;
  timestamp: string;
}

export interface WaitingRoomStatusEvent {
  enabled: boolean;
  byHostId: number;
  timestamp: string;
}
