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
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { LiveSessionsService } from './live-sessions.service';
import { NetworkDiagnosticsService } from './network-diagnostics.service';
import { BreakoutRoomsService } from './breakout-rooms.service';
import { RealTimePollsService } from './realtime-polls.service';
import { SessionAnalyticsService } from './session-analytics.service';
import { RecordingService } from './recording.service';
import { ConnectionQualityService } from './connection-quality.service';
import { SmartReconnectionService } from './smart-reconnection.service';
import { AttendanceTrackingService } from './attendance-tracking.service';
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
import { getWebRTCConfig, generateTurnCredentials } from '@config/webrtc.config';

@ApiTags('Live Sessions')
@Controller('')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LiveSessionsController {
  constructor(
    private readonly liveSessionsService: LiveSessionsService,
    private readonly networkDiagnosticsService: NetworkDiagnosticsService,
    private readonly breakoutRoomsService: BreakoutRoomsService,
    private readonly pollsService: RealTimePollsService,
    private readonly analyticsService: SessionAnalyticsService,
    private readonly recordingService: RecordingService,
    private readonly connectionQualityService: ConnectionQualityService,
    private readonly reconnectionService: SmartReconnectionService,
    private readonly attendanceService: AttendanceTrackingService,
  ) {}

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

  // ===================== WEBRTC CONFIGURATION =====================

  @Get('webrtc/config')
  @ApiOperation({ summary: 'Get WebRTC ICE servers configuration' })
  @ApiResponse({ status: 200, description: 'WebRTC configuration with ICE servers' })
  getWebRTCConfiguration(@CurrentUser() user: User) {
    // Generate time-limited TURN credentials if static secret is configured
    const turnCredentials = generateTurnCredentials(user.id);
    const config = getWebRTCConfig();

    // If we have dynamic credentials, add them
    if (turnCredentials) {
      const turnUrl = process.env.TURN_SERVER_URL;
      if (turnUrl) {
        config.iceServers.push({
          urls: turnUrl,
          username: turnCredentials.username,
          credential: turnCredentials.credential,
        });
      }
    }

    return {
      ...config,
      ttl: turnCredentials?.ttl || null,
      timestamp: new Date().toISOString(),
    };
  }

  // ===================== NETWORK DIAGNOSTICS =====================

  @Get('network/test-config')
  @ApiOperation({ summary: 'Get network test configuration (ICE servers + requirements)' })
  @ApiResponse({ status: 200, description: 'Network test configuration' })
  getNetworkTestConfig() {
    return this.networkDiagnosticsService.getIceServersForTesting();
  }

  @Post('network/analyze')
  @ApiOperation({ summary: 'Analyze network quality and get recommendations' })
  @ApiResponse({ status: 200, description: 'Network analysis result with recommendations' })
  analyzeNetwork(
    @Body() metrics: {
      latencyMs: number;
      jitterMs: number;
      packetLossPercent: number;
      downloadMbps: number;
      uploadMbps: number;
      stunSuccess: boolean;
      turnSuccess: boolean;
    },
  ) {
    return this.networkDiagnosticsService.analyzeNetworkQuality(metrics);
  }

  @Get('network/video-settings')
  @ApiOperation({ summary: 'Get recommended video settings based on bandwidth' })
  @ApiResponse({ status: 200, description: 'Recommended video encoding settings' })
  getVideoSettings(@Query('uploadMbps') uploadMbps: string) {
    const mbps = parseFloat(uploadMbps) || 1;
    return this.networkDiagnosticsService.getRecommendedVideoSettings(mbps);
  }

  @Get('network/bandwidth-test')
  @ApiOperation({ summary: 'Download test payload for bandwidth estimation' })
  @ApiResponse({ status: 200, description: 'Random binary data for speed test' })
  getBandwidthTestPayload(
    @Query('sizeKB') sizeKB: string,
    @Res() res: Response,
  ) {
    const size = Math.min(parseInt(sizeKB) || 100, 1000); // Max 1MB
    const payload = this.networkDiagnosticsService.generateTestPayload(size);
    
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Length': payload.length,
      'Cache-Control': 'no-cache',
      'X-Test-Size': size,
      'X-Timestamp': Date.now(),
    });
    
    res.send(payload);
  }

  @Post('network/bandwidth-test')
  @ApiOperation({ summary: 'Upload test for bandwidth estimation' })
  @ApiResponse({ status: 200, description: 'Upload speed result' })
  uploadBandwidthTest(
    @Body() data: { payload: string; startTime: number },
  ) {
    const endTime = Date.now();
    const duration = endTime - data.startTime;
    const sizeBytes = data.payload?.length || 0;
    const speedMbps = (sizeBytes * 8) / (duration * 1000); // Mbps
    
    return {
      sizeBytes,
      durationMs: duration,
      speedMbps: Math.round(speedMbps * 100) / 100,
      timestamp: new Date().toISOString(),
    };
  }

  // ===================== BREAKOUT ROOMS =====================

  @Post('sessions/:id/breakout-rooms')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Create breakout rooms for a session (Host only)' })
  @ApiResponse({ status: 201, description: 'Breakout rooms created' })
  createBreakoutRooms(
    @Param('id', ParseIntPipe) sessionId: number,
    @CurrentUser() user: User,
    @Body() config: {
      rooms: { name: string; participantIds?: number[] }[];
      allowParticipantsToChoose?: boolean;
      allowReturnToMain?: boolean;
      autoCloseAfterMinutes?: number;
    },
  ) {
    return this.breakoutRoomsService.createBreakoutRooms(sessionId, user.id, {
      rooms: config.rooms,
      allowParticipantsToChoose: config.allowParticipantsToChoose ?? false,
      allowReturnToMain: config.allowReturnToMain ?? true,
      autoCloseAfterMinutes: config.autoCloseAfterMinutes,
    });
  }

  @Post('sessions/:id/breakout-rooms/start')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Start breakout rooms (allow joining)' })
  @ApiResponse({ status: 200, description: 'Breakout rooms started' })
  startBreakoutRooms(
    @Param('id', ParseIntPipe) sessionId: number,
    @CurrentUser() user: User,
  ) {
    return this.breakoutRoomsService.startBreakoutRooms(sessionId, user.id);
  }

  @Post('sessions/:id/breakout-rooms/:roomId/join')
  @ApiOperation({ summary: 'Join a breakout room' })
  @ApiResponse({ status: 200, description: 'Joined breakout room' })
  joinBreakoutRoom(
    @Param('id', ParseIntPipe) sessionId: number,
    @Param('roomId') roomId: string,
    @CurrentUser() user: User,
  ) {
    return this.breakoutRoomsService.joinBreakoutRoom(
      sessionId, roomId, user.id, user.fullName,
    );
  }

  @Post('sessions/:id/breakout-rooms/leave')
  @ApiOperation({ summary: 'Leave breakout room and return to main' })
  @ApiResponse({ status: 200, description: 'Returned to main room' })
  leaveBreakoutRoom(
    @Param('id', ParseIntPipe) sessionId: number,
    @CurrentUser() user: User,
  ) {
    return this.breakoutRoomsService.leaveBreakoutRoom(sessionId, user.id);
  }

  @Get('sessions/:id/breakout-rooms/status')
  @ApiOperation({ summary: 'Get breakout rooms status' })
  @ApiResponse({ status: 200, description: 'Breakout status' })
  getBreakoutStatus(@Param('id', ParseIntPipe) sessionId: number) {
    return this.breakoutRoomsService.getBreakoutStatus(sessionId);
  }

  @Get('sessions/:id/breakout-rooms/stats')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get breakout rooms statistics (Host only)' })
  @ApiResponse({ status: 200, description: 'Breakout statistics' })
  getBreakoutStats(@Param('id', ParseIntPipe) sessionId: number) {
    return this.breakoutRoomsService.getBreakoutStatistics(sessionId);
  }

  @Post('sessions/:id/breakout-rooms/close')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Close all breakout rooms' })
  @ApiResponse({ status: 200, description: 'Breakout rooms closed' })
  closeBreakoutRooms(
    @Param('id', ParseIntPipe) sessionId: number,
    @CurrentUser() user: User,
  ) {
    return this.breakoutRoomsService.closeBreakoutRooms(sessionId, user.id);
  }

  @Post('sessions/:id/breakout-rooms/broadcast')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Broadcast message to all breakout rooms' })
  @ApiResponse({ status: 200, description: 'Message broadcasted' })
  broadcastToBreakouts(
    @Param('id', ParseIntPipe) sessionId: number,
    @CurrentUser() user: User,
    @Body() data: { message: string },
  ) {
    return this.breakoutRoomsService.broadcastToAllRooms(sessionId, user.id, data.message);
  }

  // ===================== REAL-TIME POLLS =====================

  @Post('sessions/:id/polls')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Create a new poll (Host only)' })
  @ApiResponse({ status: 201, description: 'Poll created' })
  createPoll(
    @Param('id', ParseIntPipe) sessionId: number,
    @CurrentUser() user: User,
    @Body() data: {
      question: string;
      type: 'single-choice' | 'multiple-choice' | 'word-cloud' | 'rating' | 'open-ended';
      options?: string[];
      showResultsToParticipants?: boolean;
      anonymousVoting?: boolean;
      allowChangeVote?: boolean;
      timeLimit?: number;
    },
  ) {
    return this.pollsService.createPoll(sessionId, user.id, data);
  }

  @Post('sessions/:id/polls/quick')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Create and start a quick poll' })
  @ApiResponse({ status: 201, description: 'Quick poll started' })
  quickPoll(
    @Param('id', ParseIntPipe) sessionId: number,
    @CurrentUser() user: User,
    @Body() data: { question: string; options: string[]; timeLimitSeconds?: number },
  ) {
    return this.pollsService.quickPoll(
      sessionId, user.id, data.question, data.options, data.timeLimitSeconds,
    );
  }

  @Post('sessions/:id/polls/:pollId/start')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Start a poll' })
  @ApiResponse({ status: 200, description: 'Poll started' })
  startPoll(
    @Param('pollId') pollId: string,
    @CurrentUser() user: User,
  ) {
    return this.pollsService.startPoll(pollId, user.id);
  }

  @Post('sessions/:id/polls/:pollId/end')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'End a poll' })
  @ApiResponse({ status: 200, description: 'Poll ended' })
  endPoll(
    @Param('pollId') pollId: string,
    @CurrentUser() user: User,
  ) {
    return this.pollsService.endPoll(pollId, user.id);
  }

  @Post('sessions/:id/polls/:pollId/vote')
  @ApiOperation({ summary: 'Vote on a poll' })
  @ApiResponse({ status: 200, description: 'Vote recorded' })
  votePoll(
    @Param('pollId') pollId: string,
    @CurrentUser() user: User,
    @Body() data: { optionIds?: string[]; text?: string; rating?: number },
  ) {
    return this.pollsService.vote(pollId, user.id, data);
  }

  @Get('sessions/:id/polls')
  @ApiOperation({ summary: 'Get all polls for a session' })
  @ApiResponse({ status: 200, description: 'Session polls' })
  getSessionPolls(@Param('id', ParseIntPipe) sessionId: number) {
    return this.pollsService.getSessionPolls(sessionId);
  }

  @Get('sessions/:id/polls/:pollId')
  @ApiOperation({ summary: 'Get poll details (participant view)' })
  @ApiResponse({ status: 200, description: 'Poll details' })
  getPoll(
    @Param('pollId') pollId: string,
    @CurrentUser() user: User,
  ) {
    return this.pollsService.getPollForParticipant(pollId, user.id);
  }

  @Get('sessions/:id/polls/:pollId/results')
  @ApiOperation({ summary: 'Get poll results' })
  @ApiResponse({ status: 200, description: 'Poll results' })
  getPollResults(
    @Param('pollId') pollId: string,
    @CurrentUser() user: User,
  ) {
    return this.pollsService.getResults(pollId, user.id);
  }

  @Get('sessions/:id/polls/:pollId/live-stats')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get live poll statistics (Host only)' })
  @ApiResponse({ status: 200, description: 'Live statistics' })
  getPollLiveStats(@Param('pollId') pollId: string) {
    return this.pollsService.getLiveStats(pollId);
  }

  // ===================== SESSION ANALYTICS =====================

  @Get('sessions/:id/analytics/realtime')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get real-time session analytics (Host only)' })
  @ApiResponse({ status: 200, description: 'Real-time stats' })
  getRealTimeAnalytics(@Param('id', ParseIntPipe) sessionId: number) {
    return this.analyticsService.getRealTimeStats(sessionId);
  }

  @Get('sessions/:id/analytics/summary')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get session summary (Host only)' })
  @ApiResponse({ status: 200, description: 'Session summary' })
  getSessionAnalyticsSummary(@Param('id', ParseIntPipe) sessionId: number) {
    return this.analyticsService.getSessionSummary(sessionId);
  }

  @Get('sessions/:id/analytics/participant/:userId')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get participant analytics (Host only)' })
  @ApiResponse({ status: 200, description: 'Participant summary' })
  getParticipantAnalytics(
    @Param('id', ParseIntPipe) sessionId: number,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return this.analyticsService.getParticipantSummary(sessionId, userId);
  }

  @Get('sessions/:id/analytics/timeline')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get session timeline (Host only)' })
  @ApiResponse({ status: 200, description: 'Session timeline' })
  getSessionTimeline(@Param('id', ParseIntPipe) sessionId: number) {
    return this.analyticsService.getTimeline(sessionId);
  }

  @Get('sessions/:id/analytics/export')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Export session analytics (Host only)' })
  @ApiResponse({ status: 200, description: 'Exported analytics' })
  exportSessionAnalytics(@Param('id', ParseIntPipe) sessionId: number) {
    return this.analyticsService.exportAnalytics(sessionId);
  }

  // ===================== RECORDING =====================

  @Post('sessions/:id/recording/start')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Start recording session (Host only)' })
  @ApiResponse({ status: 200, description: 'Recording started' })
  startRecording(
    @Param('id', ParseIntPipe) sessionId: number,
    @CurrentUser() user: User,
    @Body() settings?: { quality?: 'low' | 'medium' | 'high' },
  ) {
    return this.recordingService.startRecording(sessionId, user.id, settings);
  }

  @Post('sessions/:id/recording/stop')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Stop recording session' })
  @ApiResponse({ status: 200, description: 'Recording stopped' })
  stopRecording(
    @Param('id', ParseIntPipe) sessionId: number,
    @CurrentUser() user: User,
  ) {
    return this.recordingService.stopRecording(sessionId, user.id);
  }

  @Get('sessions/:id/recording/status')
  @ApiOperation({ summary: 'Get recording status' })
  @ApiResponse({ status: 200, description: 'Recording status' })
  getRecordingStatus(@Param('id', ParseIntPipe) sessionId: number) {
    return this.recordingService.getRecordingStatus(sessionId);
  }

  @Get('sessions/:id/recordings')
  @ApiOperation({ summary: 'Get all recordings for a session' })
  @ApiResponse({ status: 200, description: 'Session recordings' })
  getSessionRecordings(@Param('id', ParseIntPipe) sessionId: number) {
    return this.recordingService.getSessionRecordings(sessionId);
  }

  // ===================== CONNECTION QUALITY =====================

  @Post('sessions/:id/quality/report')
  @ApiOperation({ summary: 'Report connection quality stats' })
  @ApiResponse({ status: 200, description: 'Stats recorded' })
  reportConnectionQuality(
    @Param('id', ParseIntPipe) sessionId: number,
    @CurrentUser() user: User,
    @Body() stats: any,
  ) {
    this.connectionQualityService.reportStats(sessionId, user.id, stats);
    return { success: true };
  }

  @Get('sessions/:id/quality')
  @ApiOperation({ summary: 'Get own connection quality' })
  @ApiResponse({ status: 200, description: 'Connection quality' })
  getConnectionQuality(
    @Param('id', ParseIntPipe) sessionId: number,
    @CurrentUser() user: User,
  ) {
    return this.connectionQualityService.getParticipantQuality(sessionId, user.id);
  }

  @Get('sessions/:id/quality/all')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get all participants connection quality (Host only)' })
  @ApiResponse({ status: 200, description: 'All participants quality' })
  getAllConnectionQuality(@Param('id', ParseIntPipe) sessionId: number) {
    return this.connectionQualityService.getSessionQuality(sessionId);
  }

  @Get('sessions/:id/quality/recommendations')
  @ApiOperation({ summary: 'Get network recommendations' })
  @ApiResponse({ status: 200, description: 'Network recommendations' })
  getNetworkRecommendations(
    @Param('id', ParseIntPipe) sessionId: number,
    @CurrentUser() user: User,
  ) {
    return this.connectionQualityService.getRecommendations(sessionId, user.id);
  }

  // ===================== SMART RECONNECTION =====================

  @Post('sessions/:id/reconnect/token')
  @ApiOperation({ summary: 'Generate reconnection token' })
  @ApiResponse({ status: 200, description: 'Reconnection token' })
  generateReconnectionToken(
    @Param('id', ParseIntPipe) sessionId: number,
    @CurrentUser() user: User,
    @Body() mediaState: { audio: boolean; video: boolean; screen: boolean },
  ) {
    const token = this.reconnectionService.generateReconnectionToken(
      user.id,
      sessionId,
      `session-${sessionId}`,
      mediaState,
    );
    return { token };
  }

  @Post('sessions/reconnect')
  @ApiOperation({ summary: 'Attempt reconnection with token' })
  @ApiResponse({ status: 200, description: 'Reconnection result' })
  attemptReconnection(@Body() data: { token: string }) {
    return this.reconnectionService.attemptReconnection(data.token);
  }

  @Get('sessions/:id/disconnected')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get temporarily disconnected users (Host only)' })
  @ApiResponse({ status: 200, description: 'Disconnected users list' })
  getDisconnectedUsers(@Param('id', ParseIntPipe) sessionId: number) {
    return this.reconnectionService.getDisconnectedUsers(sessionId);
  }

  // ===================== ATTENDANCE =====================

  @Post('sessions/:id/attendance/start')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Start attendance tracking (Host only)' })
  @ApiResponse({ status: 200, description: 'Attendance tracking started' })
  startAttendance(
    @Param('id', ParseIntPipe) sessionId: number,
    @CurrentUser() user: User,
    @Body() settings?: {
      method?: 'auto' | 'code' | 'manual';
      lateThresholdMinutes?: number;
      allowLateCheckIn?: boolean;
    },
  ) {
    return this.attendanceService.startAttendance(sessionId, 0, user.id, settings);
  }

  @Post('sessions/:id/attendance/close')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Close attendance (Host only)' })
  @ApiResponse({ status: 200, description: 'Attendance closed' })
  closeAttendance(@Param('id', ParseIntPipe) sessionId: number) {
    return this.attendanceService.closeAttendance(sessionId);
  }

  @Get('sessions/:id/attendance/code')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Get current check-in code (Host only)' })
  @ApiResponse({ status: 200, description: 'Check-in code' })
  getAttendanceCode(@Param('id', ParseIntPipe) sessionId: number) {
    return this.attendanceService.getCurrentCode(sessionId);
  }

  @Post('sessions/:id/attendance/check-in')
  @ApiOperation({ summary: 'Check-in with code' })
  @ApiResponse({ status: 200, description: 'Check-in result' })
  checkInWithCode(
    @Param('id', ParseIntPipe) sessionId: number,
    @CurrentUser() user: User,
    @Body() data: { code: string },
  ) {
    return this.attendanceService.checkInWithCode(
      sessionId,
      user.id,
      data.code,
      user.fullName,
    );
  }

  @Post('sessions/:id/attendance/manual')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Manual check-in by teacher' })
  @ApiResponse({ status: 200, description: 'Manual check-in result' })
  manualCheckIn(
    @Param('id', ParseIntPipe) sessionId: number,
    @CurrentUser() user: User,
    @Body() data: { userId: number; status: 'present' | 'late' | 'absent' | 'excused'; notes?: string },
  ) {
    return this.attendanceService.manualCheckIn(
      sessionId,
      user.id,
      data.userId,
      data.status,
      data.notes,
    );
  }

  @Get('sessions/:id/attendance')
  @ApiOperation({ summary: 'Get attendance records' })
  @ApiResponse({ status: 200, description: 'Attendance records' })
  getAttendance(@Param('id', ParseIntPipe) sessionId: number) {
    return this.attendanceService.getSessionAttendance(sessionId);
  }

  @Get('sessions/:id/attendance/summary')
  @ApiOperation({ summary: 'Get attendance summary' })
  @ApiResponse({ status: 200, description: 'Attendance summary' })
  getAttendanceSummary(@Param('id', ParseIntPipe) sessionId: number) {
    return this.attendanceService.getAttendanceSummary(sessionId);
  }

  @Get('sessions/:id/attendance/export')
  @Roles(UserRole.TEACHER)
  @ApiOperation({ summary: 'Export attendance to CSV' })
  @ApiResponse({ status: 200, description: 'CSV data' })
  exportAttendance(@Param('id', ParseIntPipe) sessionId: number, @Res() res: Response) {
    const csv = this.attendanceService.exportToCSV(sessionId);
    res.set({
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="attendance-${sessionId}.csv"`,
    });
    res.send(csv);
  }
}
