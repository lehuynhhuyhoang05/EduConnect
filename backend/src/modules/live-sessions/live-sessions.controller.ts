import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LiveSessionsService } from './live-sessions.service';
import {
  CreateLiveSessionDto,
  UpdateLiveSessionDto,
  QueryLiveSessionDto,
  JoinSessionDto,
  UpdateConnectionQualityDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '@modules/auth/guards';
import { CurrentUser, Roles } from '@modules/auth/decorators';
import { User, UserRole } from '@modules/users/entities/user.entity';

@ApiTags('Live Sessions')
@Controller('')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LiveSessionsController {
  constructor(private readonly liveSessionsService: LiveSessionsService) {}

  // ===================== SESSION CRUD =====================

  @Post('classes/:classId/sessions')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Create a new live session (Teacher only)' })
  @ApiResponse({ status: 201, description: 'Session created' })
  @ApiResponse({ status: 403, description: 'Only class teacher can create sessions' })
  async createSession(
    @Param('classId', ParseIntPipe) classId: number,
    @Body() createDto: CreateLiveSessionDto,
    @CurrentUser() user: User,
  ) {
    return this.liveSessionsService.createSession(classId, createDto, user);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get all live sessions from user\'s classes' })
  @ApiResponse({ status: 200, description: 'List of sessions' })
  async findAllSessions(
    @Query() query: QueryLiveSessionDto,
    @CurrentUser() user: User,
  ) {
    return this.liveSessionsService.findAllSessions(query, user);
  }

  @Get('classes/:classId/sessions')
  @ApiOperation({ summary: 'Get all live sessions in a class' })
  @ApiResponse({ status: 200, description: 'List of sessions' })
  async findClassSessions(
    @Param('classId', ParseIntPipe) classId: number,
    @Query() query: QueryLiveSessionDto,
    @CurrentUser() user: User,
  ) {
    return this.liveSessionsService.findAllSessions({ ...query, classId }, user);
  }

  @Get('sessions/:idOrRoomId')
  @ApiOperation({ summary: 'Get session details by ID or Room ID' })
  @ApiResponse({ status: 200, description: 'Session details' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async findOneSession(
    @Param('idOrRoomId') idOrRoomId: string,
    @CurrentUser() user: User,
  ) {
    return this.liveSessionsService.findOneSession(idOrRoomId, user);
  }

  @Put('sessions/:id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Update session details (Host only)' })
  @ApiResponse({ status: 200, description: 'Session updated' })
  async updateSession(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateLiveSessionDto,
    @CurrentUser() user: User,
  ) {
    return this.liveSessionsService.updateSession(id, updateDto, user);
  }

  @Delete('sessions/:id')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Delete/cancel a session (Host only)' })
  @ApiResponse({ status: 200, description: 'Session deleted' })
  async removeSession(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    await this.liveSessionsService.removeSession(id, user);
    return { message: 'Phiên học đã được hủy' };
  }

  // ===================== SESSION LIFECYCLE =====================

  @Post('sessions/:id/start')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Start a live session (Host only)' })
  @ApiResponse({ status: 200, description: 'Session started' })
  async startSession(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.liveSessionsService.startSession(id, user);
  }

  @Post('sessions/:id/end')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'End a live session (Host only)' })
  @ApiResponse({ status: 200, description: 'Session ended' })
  async endSession(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.liveSessionsService.endSession(id, user);
  }

  // ===================== PARTICIPANT MANAGEMENT =====================

  @Post('sessions/:id/join')
  @ApiOperation({ summary: 'Join a live session' })
  @ApiResponse({ status: 200, description: 'Joined session' })
  @ApiResponse({ status: 400, description: 'Session not live or full' })
  async joinSession(
    @Param('id', ParseIntPipe) id: number,
    @Body() joinDto: JoinSessionDto,
    @CurrentUser() user: User,
  ) {
    return this.liveSessionsService.joinSession(id, user, joinDto.socketId);
  }

  @Post('sessions/:id/leave')
  @ApiOperation({ summary: 'Leave a live session' })
  @ApiResponse({ status: 200, description: 'Left session' })
  async leaveSession(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    await this.liveSessionsService.leaveSession(id, user);
    return { message: 'Đã rời khỏi phiên học' };
  }

  @Post('sessions/:id/kick/:userId')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Kick a participant (Host only)' })
  @ApiResponse({ status: 200, description: 'Participant kicked' })
  async kickParticipant(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() user: User,
  ) {
    await this.liveSessionsService.kickParticipant(id, userId, user);
    return { message: 'Đã kick thành viên khỏi phiên học' };
  }

  @Put('sessions/:id/connection-quality')
  @ApiOperation({ summary: 'Update connection quality status' })
  @ApiResponse({ status: 200, description: 'Quality updated' })
  async updateConnectionQuality(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateConnectionQualityDto,
    @CurrentUser() user: User,
  ) {
    await this.liveSessionsService.updateConnectionQuality(id, user, dto.quality);
    return { message: 'Đã cập nhật chất lượng kết nối' };
  }

  // ===================== STATISTICS =====================

  @Get('sessions/:id/stats')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get session statistics (Host only)' })
  @ApiResponse({ status: 200, description: 'Session statistics' })
  async getSessionStats(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.liveSessionsService.getSessionStats(id, user);
  }
}
