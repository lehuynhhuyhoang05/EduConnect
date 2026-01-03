import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@modules/users/entities/user.entity';
import { WhiteboardService } from './whiteboard.service';
import {
  StartStrokeDto,
  DrawMoveDto,
  EndStrokeDto,
  DrawShapeDto,
  DrawTextDto,
  ClearWhiteboardDto,
} from './dto';
import { FileLoggerService } from '@common/logger/file-logger.service';

/**
 * Whiteboard WebSocket Gateway
 * Handles real-time collaborative drawing with < 200ms latency
 * 
 * Events:
 * - wb:join-room - Join a whiteboard room
 * - wb:leave-room - Leave a whiteboard room
 * - wb:start-stroke - Start drawing a stroke
 * - wb:draw-move - Add points to current stroke (throttled)
 * - wb:end-stroke - Complete a stroke
 * - wb:draw-shape - Draw a shape (line, rect, etc.)
 * - wb:draw-text - Add text
 * - wb:erase-stroke - Erase a stroke
 * - wb:undo - Undo last stroke
 * - wb:clear - Clear whiteboard (teacher only)
 * - wb:sync-request - Request full whiteboard state
 */
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/whiteboard',
})
export class WhiteboardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WhiteboardGateway.name);

  // Socket ID -> User mapping
  private connectedUsers: Map<string, { user: User; rooms: Set<string> }> = new Map();

  constructor(
    private readonly whiteboardService: WhiteboardService,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly fileLogger: FileLoggerService,
  ) {}

  // ===================== CONNECTION LIFECYCLE =====================

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
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

      this.connectedUsers.set(client.id, { user, rooms: new Set() });
      this.logger.log(`Whiteboard client connected: ${user.email} (${client.id})`);

      // Send connection confirmation
      client.emit('wb:connected', {
        userId: user.id,
        userName: user.fullName,
        socketId: client.id,
      });
    } catch (error) {
      this.logger.warn(`Whiteboard connection failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const userData = this.connectedUsers.get(client.id);
    if (userData) {
      // Notify rooms that user left
      for (const roomKey of userData.rooms) {
        client.to(roomKey).emit('wb:user-left', {
          userId: userData.user.id,
          userName: userData.user.fullName,
        });
      }

      this.logger.log(`Whiteboard client disconnected: ${userData.user.email}`);
      this.connectedUsers.delete(client.id);
    }
  }

  // ===================== ROOM MANAGEMENT =====================

  @SubscribeMessage('wb:join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; roomType: string },
  ): Promise<void> {
    const userData = this.connectedUsers.get(client.id);
    if (!userData) {
      throw new WsException('Unauthorized');
    }

    const roomKey = `wb:${data.roomType}:${data.roomId}`;

    // Join socket room
    client.join(roomKey);
    userData.rooms.add(roomKey);

    // Get current whiteboard state
    try {
      const strokes = await this.whiteboardService.getWhiteboardState(
        data.roomId,
        data.roomType,
        userData.user,
      );

      // Send current state to joining user
      client.emit('wb:sync-state', {
        roomId: data.roomId,
        roomType: data.roomType,
        strokes,
      });

      // Notify others
      client.to(roomKey).emit('wb:user-joined', {
        userId: userData.user.id,
        userName: userData.user.fullName,
      });

      this.fileLogger.whiteboard('log', 'User joined whiteboard room', {
        roomId: data.roomId,
        userId: userData.user.id,
      });
    } catch (error) {
      client.emit('wb:error', { message: error.message });
    }
  }

  @SubscribeMessage('wb:leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; roomType: string },
  ): void {
    const userData = this.connectedUsers.get(client.id);
    if (!userData) return;

    const roomKey = `wb:${data.roomType}:${data.roomId}`;

    client.leave(roomKey);
    userData.rooms.delete(roomKey);

    // Notify others
    client.to(roomKey).emit('wb:user-left', {
      userId: userData.user.id,
      userName: userData.user.fullName,
    });
  }

  // ===================== DRAWING EVENTS =====================

  @SubscribeMessage('wb:start-stroke')
  async handleStartStroke(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: StartStrokeDto,
  ): Promise<void> {
    const userData = this.connectedUsers.get(client.id);
    if (!userData) {
      throw new WsException('Unauthorized');
    }

    try {
      const result = await this.whiteboardService.startStroke(data, userData.user);

      const roomKey = `wb:${data.roomType}:${data.roomId}`;

      // Broadcast to others in room (NOT to sender - they already drew it locally)
      client.to(roomKey).emit('wb:stroke-started', {
        strokeId: data.strokeId,
        userId: userData.user.id,
        userName: userData.user.fullName,
        tool: data.tool,
        color: data.color,
        strokeWidth: data.strokeWidth,
        opacity: data.opacity,
        startPoint: data.startPoint,
      });
    } catch (error) {
      client.emit('wb:error', { message: error.message });
    }
  }

  @SubscribeMessage('wb:draw-move')
  handleDrawMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: DrawMoveDto,
  ): void {
    const userData = this.connectedUsers.get(client.id);
    if (!userData) return;

    const result = this.whiteboardService.drawMove(data, userData.user);
    if (!result) return;

    const roomKey = `wb:${data.roomType}:${data.roomId}`;

    // Broadcast points to others (high frequency - throttle on client side)
    client.to(roomKey).emit('wb:stroke-move', {
      strokeId: data.strokeId,
      points: data.points,
    });
  }

  @SubscribeMessage('wb:end-stroke')
  async handleEndStroke(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: EndStrokeDto,
  ): Promise<void> {
    const userData = this.connectedUsers.get(client.id);
    if (!userData) return;

    try {
      const result = await this.whiteboardService.endStroke(data, userData.user);

      if (result) {
        const roomKey = `wb:${data.roomType}:${data.roomId}`;

        // Confirm stroke completion to everyone (including sender for persistence confirmation)
        this.server.to(roomKey).emit('wb:stroke-completed', {
          strokeId: data.strokeId,
          id: result.id,
        });
      }
    } catch (error) {
      client.emit('wb:error', { message: error.message });
    }
  }

  @SubscribeMessage('wb:draw-shape')
  async handleDrawShape(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: DrawShapeDto,
  ): Promise<void> {
    const userData = this.connectedUsers.get(client.id);
    if (!userData) {
      throw new WsException('Unauthorized');
    }

    try {
      const result = await this.whiteboardService.drawShape(data, userData.user);

      const roomKey = `wb:${data.roomType}:${data.roomId}`;

      // Broadcast shape to others
      client.to(roomKey).emit('wb:shape-drawn', {
        strokeId: data.strokeId,
        id: result.id,
        tool: data.tool,
        userId: userData.user.id,
        color: data.color,
        strokeWidth: data.strokeWidth,
        startX: data.startX,
        startY: data.startY,
        endX: data.endX,
        endY: data.endY,
      });
    } catch (error) {
      client.emit('wb:error', { message: error.message });
    }
  }

  @SubscribeMessage('wb:draw-text')
  async handleDrawText(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: DrawTextDto,
  ): Promise<void> {
    const userData = this.connectedUsers.get(client.id);
    if (!userData) {
      throw new WsException('Unauthorized');
    }

    try {
      const result = await this.whiteboardService.drawText(data, userData.user);

      const roomKey = `wb:${data.roomType}:${data.roomId}`;

      // Broadcast text to others
      client.to(roomKey).emit('wb:text-drawn', {
        strokeId: data.strokeId,
        id: result.id,
        text: data.text,
        x: data.x,
        y: data.y,
        color: data.color,
        fontSize: data.fontSize,
        fontFamily: data.fontFamily,
        userId: userData.user.id,
      });
    } catch (error) {
      client.emit('wb:error', { message: error.message });
    }
  }

  // ===================== UNDO/CLEAR EVENTS =====================

  @SubscribeMessage('wb:erase-stroke')
  async handleEraseStroke(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { strokeId: string; roomId: string; roomType: string },
  ): Promise<void> {
    const userData = this.connectedUsers.get(client.id);
    if (!userData) {
      throw new WsException('Unauthorized');
    }

    try {
      const deleted = await this.whiteboardService.deleteStroke(
        data.strokeId,
        data.roomId,
        data.roomType,
        userData.user,
      );

      if (deleted) {
        const roomKey = `wb:${data.roomType}:${data.roomId}`;

        // Broadcast erasure to all
        this.server.to(roomKey).emit('wb:stroke-erased', {
          strokeId: data.strokeId,
          userId: userData.user.id,
        });
      }
    } catch (error) {
      client.emit('wb:error', { message: error.message });
    }
  }

  @SubscribeMessage('wb:undo')
  async handleUndo(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; roomType: string },
  ): Promise<void> {
    const userData = this.connectedUsers.get(client.id);
    if (!userData) {
      throw new WsException('Unauthorized');
    }

    try {
      const strokeId = await this.whiteboardService.undoLastStroke(
        data.roomId,
        data.roomType,
        userData.user,
      );

      if (strokeId) {
        const roomKey = `wb:${data.roomType}:${data.roomId}`;

        // Broadcast undo to all
        this.server.to(roomKey).emit('wb:stroke-undone', {
          strokeId,
          userId: userData.user.id,
        });
      }
    } catch (error) {
      client.emit('wb:error', { message: error.message });
    }
  }

  @SubscribeMessage('wb:clear')
  async handleClear(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ClearWhiteboardDto,
  ): Promise<void> {
    const userData = this.connectedUsers.get(client.id);
    if (!userData) {
      throw new WsException('Unauthorized');
    }

    try {
      const count = await this.whiteboardService.clearWhiteboard(data, userData.user);

      const roomKey = `wb:${data.roomType}:${data.roomId}`;

      // Broadcast clear to all
      this.server.to(roomKey).emit('wb:cleared', {
        userId: userData.user.id,
        userName: userData.user.fullName,
        strokesCleared: count,
      });
    } catch (error) {
      client.emit('wb:error', { message: error.message });
    }
  }

  // ===================== SYNC REQUEST =====================

  @SubscribeMessage('wb:sync-request')
  async handleSyncRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; roomType: string },
  ): Promise<void> {
    const userData = this.connectedUsers.get(client.id);
    if (!userData) {
      throw new WsException('Unauthorized');
    }

    try {
      const strokes = await this.whiteboardService.getWhiteboardState(
        data.roomId,
        data.roomType,
        userData.user,
      );

      client.emit('wb:sync-state', {
        roomId: data.roomId,
        roomType: data.roomType,
        strokes,
      });
    } catch (error) {
      client.emit('wb:error', { message: error.message });
    }
  }

  // ===================== HELPERS =====================

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    const token = client.handshake.auth?.token;
    if (token) {
      return token;
    }
    const queryToken = client.handshake.query?.token;
    if (queryToken && typeof queryToken === 'string') {
      return queryToken;
    }
    return null;
  }

  /**
   * Get online users in a whiteboard room
   */
  getOnlineUsersInRoom(roomId: string, roomType: string): number[] {
    const roomKey = `wb:${roomType}:${roomId}`;
    const userIds: number[] = [];

    for (const [socketId, userData] of this.connectedUsers.entries()) {
      if (userData.rooms.has(roomKey)) {
        userIds.push(userData.user.id);
      }
    }

    return userIds;
  }
}
