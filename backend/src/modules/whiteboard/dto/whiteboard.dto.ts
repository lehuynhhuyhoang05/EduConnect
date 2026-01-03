import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsEnum,
  IsArray,
  IsOptional,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DrawingTool } from '../entities/whiteboard-stroke.entity';

/**
 * Drawing point validation
 */
export class DrawingPointDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  pressure?: number;
}

/**
 * DTO for starting a new stroke
 */
export class StartStrokeDto {
  @IsString()
  @IsNotEmpty()
  strokeId: string;

  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  roomType: string;

  @IsEnum(DrawingTool)
  tool: DrawingTool;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{3}$|^rgba?\([\d,\s.]+\)$/)
  color: string;

  @IsNumber()
  @Min(0.5)
  @Max(50)
  strokeWidth: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  opacity?: number;

  @ValidateNested()
  @Type(() => DrawingPointDto)
  startPoint: DrawingPointDto;
}

/**
 * DTO for drawing (adding points to stroke)
 */
export class DrawMoveDto {
  @IsString()
  @IsNotEmpty()
  strokeId: string;

  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  roomType: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DrawingPointDto)
  points: DrawingPointDto[];
}

/**
 * DTO for ending a stroke
 */
export class EndStrokeDto {
  @IsString()
  @IsNotEmpty()
  strokeId: string;

  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  roomType: string;
}

/**
 * DTO for shape tools (line, rectangle, ellipse, arrow)
 */
export class DrawShapeDto {
  @IsString()
  @IsNotEmpty()
  strokeId: string;

  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  roomType: string;

  @IsEnum(DrawingTool)
  tool: DrawingTool;

  @IsString()
  color: string;

  @IsNumber()
  @Min(0.5)
  @Max(50)
  strokeWidth: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  opacity?: number;

  @IsNumber()
  startX: number;

  @IsNumber()
  startY: number;

  @IsNumber()
  endX: number;

  @IsNumber()
  endY: number;
}

/**
 * DTO for text tool
 */
export class DrawTextDto {
  @IsString()
  @IsNotEmpty()
  strokeId: string;

  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  roomType: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsString()
  color: string;

  @IsNumber()
  @Min(8)
  @Max(72)
  fontSize: number;

  @IsOptional()
  @IsString()
  fontFamily?: string;
}

/**
 * DTO for erasing strokes
 */
export class EraseStrokeDto {
  @IsString()
  @IsNotEmpty()
  strokeId: string;

  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  roomType: string;
}

/**
 * DTO for clearing whiteboard
 */
export class ClearWhiteboardDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  roomType: string;
}

/**
 * DTO for undo operation
 */
export class UndoDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  roomType: string;
}

/**
 * Response DTO for whiteboard stroke
 */
export class WhiteboardStrokeResponseDto {
  id: number;
  strokeId: string;
  roomId: string;
  roomType: string;
  userId: number;
  userName?: string;
  tool: DrawingTool;
  path: DrawingPointDto[];
  color: string;
  strokeWidth: number;
  opacity: number;
  textContent?: string;
  fontSize?: number;
  fontFamily?: string;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  createdAt: Date;
}
