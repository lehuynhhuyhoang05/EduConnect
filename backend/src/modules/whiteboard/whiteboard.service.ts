import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { WhiteboardStroke, DrawingTool, DrawingPoint } from './entities';
import {
  StartStrokeDto,
  DrawMoveDto,
  EndStrokeDto,
  DrawShapeDto,
  DrawTextDto,
  ClearWhiteboardDto,
  WhiteboardStrokeResponseDto,
} from './dto';
import { User } from '@modules/users/entities/user.entity';
import { ClassesService } from '@modules/classes/classes.service';
import { FileLoggerService } from '@common/logger/file-logger.service';

@Injectable()
export class WhiteboardService {
  private readonly logger = new Logger(WhiteboardService.name);

  // In-memory stroke buffers for real-time performance
  // Key: `${roomId}:${roomType}:${strokeId}` -> Stroke data
  private activeStrokes: Map<string, {
    stroke: Partial<WhiteboardStroke>;
    points: DrawingPoint[];
    lastUpdate: number;
  }> = new Map();

  constructor(
    @InjectRepository(WhiteboardStroke)
    private readonly strokeRepository: Repository<WhiteboardStroke>,
    private readonly classesService: ClassesService,
    private readonly dataSource: DataSource,
    private readonly fileLogger: FileLoggerService,
  ) {}

  // ===================== STROKE OPERATIONS =====================

  /**
   * Start a new stroke (pen/highlighter drawing)
   */
  async startStroke(dto: StartStrokeDto, user: User): Promise<WhiteboardStrokeResponseDto> {
    this.fileLogger.whiteboard('log', 'startStroke', {
      strokeId: dto.strokeId,
      roomId: dto.roomId,
      userId: user.id,
      tool: dto.tool,
    });

    // Verify room access
    await this.verifyRoomAccess(dto.roomId, dto.roomType, user);

    // Store in memory for fast updates
    const strokeKey = `${dto.roomId}:${dto.roomType}:${dto.strokeId}`;
    this.activeStrokes.set(strokeKey, {
      stroke: {
        roomId: dto.roomId,
        roomType: dto.roomType,
        userId: user.id,
        strokeId: dto.strokeId,
        tool: dto.tool,
        color: dto.color,
        strokeWidth: dto.strokeWidth,
        opacity: dto.opacity || 1,
      },
      points: [dto.startPoint],
      lastUpdate: Date.now(),
    });

    return {
      id: 0, // Not persisted yet
      strokeId: dto.strokeId,
      roomId: dto.roomId,
      roomType: dto.roomType,
      userId: user.id,
      userName: user.fullName,
      tool: dto.tool,
      path: [dto.startPoint],
      color: dto.color,
      strokeWidth: dto.strokeWidth,
      opacity: dto.opacity || 1,
      createdAt: new Date(),
    };
  }

  /**
   * Add points to an active stroke (real-time drawing)
   */
  drawMove(dto: DrawMoveDto, user: User): { points: DrawingPoint[]; strokeId: string } | null {
    const strokeKey = `${dto.roomId}:${dto.roomType}:${dto.strokeId}`;
    const activeStroke = this.activeStrokes.get(strokeKey);

    if (!activeStroke || activeStroke.stroke.userId !== user.id) {
      return null;
    }

    // Add points to buffer
    activeStroke.points.push(...dto.points);
    activeStroke.lastUpdate = Date.now();

    return {
      strokeId: dto.strokeId,
      points: dto.points,
    };
  }

  /**
   * End a stroke and persist to database
   */
  async endStroke(dto: EndStrokeDto, user: User): Promise<WhiteboardStrokeResponseDto | null> {
    const strokeKey = `${dto.roomId}:${dto.roomType}:${dto.strokeId}`;
    const activeStroke = this.activeStrokes.get(strokeKey);

    if (!activeStroke || activeStroke.stroke.userId !== user.id) {
      return null;
    }

    try {
      // Persist to database
      const stroke = this.strokeRepository.create({
        ...activeStroke.stroke as WhiteboardStroke,
        path: activeStroke.points,
      });

      const saved = await this.strokeRepository.save(stroke);

      this.fileLogger.whiteboard('log', 'Stroke saved', {
        strokeId: dto.strokeId,
        points: activeStroke.points.length,
      });

      // Remove from active strokes
      this.activeStrokes.delete(strokeKey);

      return this.toResponseDto(saved, user);
    } catch (error) {
      this.fileLogger.whiteboard('error', 'Failed to save stroke', {
        strokeId: dto.strokeId,
        error: error.message,
      });
      this.activeStrokes.delete(strokeKey);
      throw error;
    }
  }

  /**
   * Draw a shape (line, rectangle, ellipse, arrow)
   */
  async drawShape(dto: DrawShapeDto, user: User): Promise<WhiteboardStrokeResponseDto> {
    await this.verifyRoomAccess(dto.roomId, dto.roomType, user);

    const stroke = this.strokeRepository.create({
      roomId: dto.roomId,
      roomType: dto.roomType,
      userId: user.id,
      strokeId: dto.strokeId,
      tool: dto.tool,
      color: dto.color,
      strokeWidth: dto.strokeWidth,
      opacity: dto.opacity || 1,
      startX: dto.startX,
      startY: dto.startY,
      endX: dto.endX,
      endY: dto.endY,
      path: [],
    });

    const saved = await this.strokeRepository.save(stroke);

    this.fileLogger.whiteboard('log', 'Shape drawn', {
      strokeId: dto.strokeId,
      tool: dto.tool,
      roomId: dto.roomId,
    });

    return this.toResponseDto(saved, user);
  }

  /**
   * Draw text on whiteboard
   */
  async drawText(dto: DrawTextDto, user: User): Promise<WhiteboardStrokeResponseDto> {
    await this.verifyRoomAccess(dto.roomId, dto.roomType, user);

    const stroke = this.strokeRepository.create({
      roomId: dto.roomId,
      roomType: dto.roomType,
      userId: user.id,
      strokeId: dto.strokeId,
      tool: DrawingTool.TEXT,
      color: dto.color,
      textContent: dto.text,
      fontSize: dto.fontSize,
      fontFamily: dto.fontFamily || 'Arial',
      startX: dto.x,
      startY: dto.y,
      path: [],
      strokeWidth: 1,
      opacity: 1,
    });

    const saved = await this.strokeRepository.save(stroke);

    this.fileLogger.whiteboard('log', 'Text added', {
      strokeId: dto.strokeId,
      roomId: dto.roomId,
    });

    return this.toResponseDto(saved, user);
  }

  // ===================== UNDO/CLEAR OPERATIONS =====================

  /**
   * Delete a specific stroke (for undo/erase)
   */
  async deleteStroke(strokeId: string, roomId: string, roomType: string, user: User): Promise<boolean> {
    const stroke = await this.strokeRepository.findOne({
      where: { strokeId, roomId, roomType },
    });

    if (!stroke) {
      return false;
    }

    // Check if user owns stroke or is teacher of room
    const canDelete = stroke.userId === user.id || await this.canModerateRoom(roomId, roomType, user);

    if (!canDelete) {
      throw new ForbiddenException('Bạn không có quyền xóa nét vẽ này');
    }

    stroke.isDeleted = true;
    await this.strokeRepository.save(stroke);

    this.fileLogger.whiteboard('log', 'Stroke deleted', { strokeId, roomId });

    return true;
  }

  /**
   * Undo last stroke by user
   */
  async undoLastStroke(roomId: string, roomType: string, user: User): Promise<string | null> {
    const lastStroke = await this.strokeRepository.findOne({
      where: { roomId, roomType, userId: user.id, isDeleted: false },
      order: { createdAt: 'DESC' },
    });

    if (!lastStroke) {
      return null;
    }

    lastStroke.isDeleted = true;
    await this.strokeRepository.save(lastStroke);

    this.fileLogger.whiteboard('log', 'Stroke undone', {
      strokeId: lastStroke.strokeId,
      roomId,
    });

    return lastStroke.strokeId;
  }

  /**
   * Clear all strokes in a room (teacher only)
   */
  async clearWhiteboard(dto: ClearWhiteboardDto, user: User): Promise<number> {
    // Verify teacher/host permission
    const canClear = await this.canModerateRoom(dto.roomId, dto.roomType, user);

    if (!canClear) {
      throw new ForbiddenException('Chỉ giáo viên mới có thể xóa toàn bộ bảng');
    }

    // Mark all strokes as deleted
    const result = await this.strokeRepository.update(
      { roomId: dto.roomId, roomType: dto.roomType, isDeleted: false },
      { isDeleted: true },
    );

    this.fileLogger.whiteboard('log', 'Whiteboard cleared', {
      roomId: dto.roomId,
      strokesCleared: result.affected,
      clearedBy: user.id,
    });

    return result.affected || 0;
  }

  // ===================== QUERY OPERATIONS =====================

  /**
   * Get all strokes for a room (for joining users)
   */
  async getWhiteboardState(
    roomId: string,
    roomType: string,
    user: User,
  ): Promise<WhiteboardStrokeResponseDto[]> {
    await this.verifyRoomAccess(roomId, roomType, user);

    const strokes = await this.strokeRepository.find({
      where: { roomId, roomType, isDeleted: false },
      relations: ['user'],
      order: { createdAt: 'ASC' },
    });

    this.fileLogger.whiteboard('log', 'Whiteboard state loaded', {
      roomId,
      strokeCount: strokes.length,
      userId: user.id,
    });

    return strokes.map((s) => this.toResponseDto(s, s.user));
  }

  /**
   * Get stroke count for a room
   */
  async getStrokeCount(roomId: string, roomType: string): Promise<number> {
    return this.strokeRepository.count({
      where: { roomId, roomType, isDeleted: false },
    });
  }

  // ===================== HELPER METHODS =====================

  /**
   * Verify user has access to the room
   */
  private async verifyRoomAccess(roomId: string, roomType: string, user: User): Promise<void> {
    if (roomType === 'class') {
      const classId = parseInt(roomId);
      const isMember = await this.classesService.isMember(classId, user.id);
      const isTeacher = await this.classesService.isTeacher(classId, user.id);
      if (!isMember && !isTeacher) {
        throw new ForbiddenException('Bạn không phải thành viên của lớp này');
      }
    }
    // For live-session, access is handled by LiveSessionsService
  }

  /**
   * Check if user can moderate (clear board, delete others' strokes)
   */
  private async canModerateRoom(roomId: string, roomType: string, user: User): Promise<boolean> {
    if (roomType === 'class') {
      const classId = parseInt(roomId);
      return this.classesService.isTeacher(classId, user.id);
    }
    // For live-session, check if user is host
    return false;
  }

  /**
   * Convert entity to response DTO
   */
  private toResponseDto(stroke: WhiteboardStroke, user?: User): WhiteboardStrokeResponseDto {
    return {
      id: stroke.id,
      strokeId: stroke.strokeId,
      roomId: stroke.roomId,
      roomType: stroke.roomType,
      userId: stroke.userId,
      userName: user?.fullName,
      tool: stroke.tool,
      path: stroke.path || [],
      color: stroke.color,
      strokeWidth: stroke.strokeWidth,
      opacity: stroke.opacity,
      textContent: stroke.textContent,
      fontSize: stroke.fontSize,
      fontFamily: stroke.fontFamily,
      startX: stroke.startX,
      startY: stroke.startY,
      endX: stroke.endX,
      endY: stroke.endY,
      createdAt: stroke.createdAt,
    };
  }

  /**
   * Cleanup old active strokes (run periodically)
   */
  cleanupStaleStrokes(): number {
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    let cleaned = 0;

    for (const [key, value] of this.activeStrokes.entries()) {
      if (now - value.lastUpdate > staleThreshold) {
        this.activeStrokes.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.fileLogger.whiteboard('log', 'Cleaned stale strokes', { count: cleaned });
    }

    return cleaned;
  }
}
