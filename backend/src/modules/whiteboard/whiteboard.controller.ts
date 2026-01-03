import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@modules/auth/guards/roles.guard';
import { CurrentUser, Roles } from '@modules/auth/decorators';
import { User, UserRole } from '@modules/users/entities/user.entity';
import { WhiteboardService } from './whiteboard.service';
import { ClearWhiteboardDto } from './dto';

/**
 * Whiteboard REST Controller
 * For querying whiteboard state and management operations
 * Real-time drawing is handled by WhiteboardGateway (WebSocket)
 */
@Controller('whiteboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WhiteboardController {
  constructor(private readonly whiteboardService: WhiteboardService) {}

  /**
   * Get whiteboard state for a room
   */
  @Get(':roomType/:roomId')
  async getWhiteboardState(
    @Param('roomType') roomType: string,
    @Param('roomId') roomId: string,
    @CurrentUser() user: User,
  ) {
    const strokes = await this.whiteboardService.getWhiteboardState(roomId, roomType, user);
    return {
      roomId,
      roomType,
      strokes,
      strokeCount: strokes.length,
    };
  }

  /**
   * Get stroke count for a room
   */
  @Get(':roomType/:roomId/count')
  async getStrokeCount(
    @Param('roomType') roomType: string,
    @Param('roomId') roomId: string,
    @CurrentUser() user: User,
  ) {
    // Verify access first
    await this.whiteboardService.getWhiteboardState(roomId, roomType, user);
    const count = await this.whiteboardService.getStrokeCount(roomId, roomType);
    return { roomId, roomType, strokeCount: count };
  }

  /**
   * Clear whiteboard (Teacher only)
   */
  @Delete(':roomType/:roomId')
  @Roles(UserRole.TEACHER)
  async clearWhiteboard(
    @Param('roomType') roomType: string,
    @Param('roomId') roomId: string,
    @CurrentUser() user: User,
  ) {
    const count = await this.whiteboardService.clearWhiteboard(
      { roomId, roomType },
      user,
    );
    return {
      message: 'Whiteboard cleared',
      strokesCleared: count,
    };
  }

  /**
   * Undo last stroke
   */
  @Post(':roomType/:roomId/undo')
  async undoLastStroke(
    @Param('roomType') roomType: string,
    @Param('roomId') roomId: string,
    @CurrentUser() user: User,
  ) {
    const strokeId = await this.whiteboardService.undoLastStroke(roomId, roomType, user);
    return {
      success: !!strokeId,
      strokeId,
    };
  }

  /**
   * Delete a specific stroke
   */
  @Delete(':roomType/:roomId/strokes/:strokeId')
  async deleteStroke(
    @Param('roomType') roomType: string,
    @Param('roomId') roomId: string,
    @Param('strokeId') strokeId: string,
    @CurrentUser() user: User,
  ) {
    const deleted = await this.whiteboardService.deleteStroke(strokeId, roomId, roomType, user);
    return {
      success: deleted,
      strokeId,
    };
  }
}
