import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@modules/users/entities/user.entity';
import { PollsService } from './polls.service';
import { CreatePollDto, SubmitResponseDto } from './dto';
import { Poll, PollStatus } from './entities/poll.entity';

interface AuthenticatedSocket extends Socket {
  user?: User;
}

/**
 * Poll WebSocket Gateway
 * Real-time poll/quiz functionality
 * 
 * Events:
 * - poll:create - Create a new poll
 * - poll:start - Start a poll
 * - poll:close - Close a poll
 * - poll:submit - Submit response
 * - poll:results - Get live results
 * 
 * Broadcasts:
 * - poll:created - New poll created
 * - poll:started - Poll started
 * - poll:closed - Poll closed
 * - poll:new-response - New response submitted
 * - poll:results-update - Results updated
 */
@WebSocketGateway({
  namespace: '/polls',
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class PollsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('PollsGateway');
  private roomUsers: Map<string, Set<number>> = new Map();
  private activeTimers: Map<number, NodeJS.Timeout> = new Map();

  constructor(
    private readonly pollsService: PollsService,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Handle connection
   */
  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token || 
                    client.handshake.headers?.authorization?.split(' ')[1];
      
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      
      if (!user) {
        client.disconnect();
        return;
      }

      client.user = user;
      this.logger.log(`User ${user.fullName} connected to polls`);
    } catch (error) {
      this.logger.error('Connection error:', error.message);
      client.disconnect();
    }
  }

  /**
   * Handle disconnection
   */
  handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      this.logger.log(`User ${client.user.fullName} disconnected from polls`);
      // Remove from all rooms
      this.roomUsers.forEach((users, room) => {
        users.delete(client.user!.id);
      });
    }
  }

  /**
   * Join a poll room (class or session)
   */
  @SubscribeMessage('poll:join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { classId?: number; sessionId?: number },
  ) {
    const roomId = this.getRoomId(data.classId, data.sessionId);
    client.join(roomId);
    
    if (!this.roomUsers.has(roomId)) {
      this.roomUsers.set(roomId, new Set());
    }
    this.roomUsers.get(roomId)!.add(client.user!.id);

    this.logger.log(`User ${client.user?.fullName} joined room ${roomId}`);
    
    return { success: true, room: roomId };
  }

  /**
   * Leave a poll room
   */
  @SubscribeMessage('poll:leave-room')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { classId?: number; sessionId?: number },
  ) {
    const roomId = this.getRoomId(data.classId, data.sessionId);
    client.leave(roomId);
    
    this.roomUsers.get(roomId)?.delete(client.user!.id);
    
    return { success: true };
  }

  /**
   * Create a new poll (Teacher only)
   */
  @SubscribeMessage('poll:create')
  async handleCreatePoll(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: CreatePollDto,
  ) {
    try {
      const poll = await this.pollsService.create(data, client.user!);
      const roomId = this.getRoomId(data.classId, data.sessionId);

      // Broadcast to room
      this.server.to(roomId).emit('poll:created', {
        poll,
        createdBy: {
          id: client.user!.id,
          fullName: client.user!.fullName,
        },
      });

      this.logger.log(`Poll created: ${poll.id} by ${client.user?.fullName}`);
      return { success: true, poll };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Start a poll
   */
  @SubscribeMessage('poll:start')
  async handleStartPoll(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { pollId: number },
  ) {
    try {
      const poll = await this.pollsService.startPoll(data.pollId, client.user!.id);
      const roomId = this.getRoomId(poll.classId, poll.sessionId);

      // Broadcast poll started
      this.server.to(roomId).emit('poll:started', {
        poll,
        startedAt: poll.startedAt,
        timeLimit: poll.timeLimit,
      });

      // Set auto-close timer if time limit exists
      if (poll.timeLimit > 0) {
        const timer = setTimeout(async () => {
          await this.autoClosePoll(poll.id, client.user!.id);
        }, poll.timeLimit * 1000);
        
        this.activeTimers.set(poll.id, timer);
      }

      this.logger.log(`Poll started: ${poll.id}`);
      return { success: true, poll };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Close a poll
   */
  @SubscribeMessage('poll:close')
  async handleClosePoll(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { pollId: number },
  ) {
    try {
      const poll = await this.pollsService.closePoll(data.pollId, client.user!.id);
      const roomId = this.getRoomId(poll.classId, poll.sessionId);

      // Clear auto-close timer
      const timer = this.activeTimers.get(poll.id);
      if (timer) {
        clearTimeout(timer);
        this.activeTimers.delete(poll.id);
      }

      // Get final results
      const results = await this.pollsService.getLiveResults(poll.id);

      // Broadcast poll closed with results
      this.server.to(roomId).emit('poll:closed', {
        poll,
        results: results.results,
        totalResponses: results.totalResponses,
        leaderboard: results.leaderboard,
      });

      this.logger.log(`Poll closed: ${poll.id}`);
      return { success: true, poll, results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Submit a response
   */
  @SubscribeMessage('poll:submit')
  async handleSubmitResponse(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SubmitResponseDto,
  ) {
    try {
      const response = await this.pollsService.submitResponse(data, client.user!);
      const poll = await this.pollsService.findOne(data.pollId);
      const roomId = this.getRoomId(poll.classId, poll.sessionId);

      // Get updated results
      const results = await this.pollsService.getLiveResults(data.pollId);

      // Broadcast new response (anonymized if needed)
      this.server.to(roomId).emit('poll:new-response', {
        pollId: data.pollId,
        responseCount: results.totalResponses,
        results: poll.showResults ? results.results : null,
        // Only send user info if not anonymous
        respondent: poll.anonymous ? null : {
          id: client.user!.id,
          fullName: client.user!.fullName,
        },
      });

      // Send personal result to submitter (for quiz)
      if (poll.isQuiz) {
        client.emit('poll:your-result', {
          pollId: data.pollId,
          isCorrect: response.isCorrect,
          points: response.points,
          correctAnswers: poll.status === PollStatus.CLOSED ? poll.correctAnswers : null,
        });
      }

      this.logger.log(`Response submitted for poll ${data.pollId} by ${client.user?.fullName}`);
      return { success: true, response };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get live results
   */
  @SubscribeMessage('poll:get-results')
  async handleGetResults(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { pollId: number },
  ) {
    try {
      const results = await this.pollsService.getLiveResults(data.pollId);
      const hasResponded = await this.pollsService.hasResponded(data.pollId, client.user!.id);
      const userResponse = hasResponded 
        ? await this.pollsService.getUserResponse(data.pollId, client.user!.id)
        : null;

      return { 
        success: true, 
        ...results,
        hasResponded,
        userResponse,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Auto close poll when time expires
   */
  private async autoClosePoll(pollId: number, userId: number) {
    try {
      const poll = await this.pollsService.closePoll(pollId, userId);
      const roomId = this.getRoomId(poll.classId, poll.sessionId);
      const results = await this.pollsService.getLiveResults(pollId);

      this.server.to(roomId).emit('poll:closed', {
        poll,
        results: results.results,
        totalResponses: results.totalResponses,
        leaderboard: results.leaderboard,
        autoClose: true,
      });

      this.activeTimers.delete(pollId);
      this.logger.log(`Poll ${pollId} auto-closed due to time limit`);
    } catch (error) {
      this.logger.error(`Failed to auto-close poll ${pollId}:`, error.message);
    }
  }

  /**
   * Get room ID from class/session
   */
  private getRoomId(classId?: number, sessionId?: number): string {
    if (sessionId) return `session:${sessionId}`;
    if (classId) return `class:${classId}`;
    return 'global';
  }
}
