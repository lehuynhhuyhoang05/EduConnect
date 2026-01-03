import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LiveSessionsService } from './live-sessions.service';
import { ConnectionQuality } from './entities';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  roomId?: string;
}

interface SignalingMessage {
  targetUserId: number;
  type: 'offer' | 'answer' | 'ice-candidate';
  payload: any;
}

interface MediaStateMessage {
  roomId: string;
  audio: boolean;
  video: boolean;
  screen?: boolean;
}

@WebSocketGateway({
  namespace: '/live',
  cors: {
    origin: '*',
    credentials: true,
  },
})
@Injectable()
export class LiveSessionsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LiveSessionsGateway.name);
  
  // Map userId -> socketId for signaling
  private userSocketMap = new Map<number, string>();
  // Map socketId -> userId for reverse lookup
  private socketUserMap = new Map<string, number>();
  // Map roomId -> Set of userIds
  private roomParticipants = new Map<string, Set<number>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly liveSessionsService: LiveSessionsService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Live Sessions WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract and verify JWT token
      const token = client.handshake.auth?.token || 
                    client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      
      this.userSocketMap.set(client.userId, client.id);
      this.socketUserMap.set(client.id, client.userId);

      this.logger.log(`User ${client.userId} connected with socket ${client.id}`);
      
      // Notify client of successful connection
      client.emit('connected', { 
        userId: client.userId,
        socketId: client.id,
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const userId = this.socketUserMap.get(client.id);
    
    if (userId) {
      this.userSocketMap.delete(userId);
      this.socketUserMap.delete(client.id);

      // Leave all rooms and notify participants
      if (client.roomId) {
        const roomParticipants = this.roomParticipants.get(client.roomId);
        if (roomParticipants) {
          roomParticipants.delete(userId);
          
          // Notify others in room
          client.to(client.roomId).emit('user-left', {
            userId,
            roomId: client.roomId,
            timestamp: new Date().toISOString(),
          });
        }
      }

      this.logger.log(`User ${userId} disconnected`);
    }
  }

  // ===================== ROOM MANAGEMENT =====================

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; sessionId: number },
  ) {
    const { roomId, sessionId } = data;
    const userId = client.userId;

    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Join the socket room
      await client.join(roomId);
      client.roomId = roomId;

      // Track room participants
      if (!this.roomParticipants.has(roomId)) {
        this.roomParticipants.set(roomId, new Set());
      }
      this.roomParticipants.get(roomId).add(userId);

      // Get existing participants in room
      const existingParticipants = Array.from(this.roomParticipants.get(roomId))
        .filter(id => id !== userId)
        .map(id => ({
          userId: id,
          socketId: this.userSocketMap.get(id),
        }));

      // Notify others in room about new participant
      client.to(roomId).emit('user-joined', {
        userId,
        socketId: client.id,
        roomId,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`User ${userId} joined room ${roomId}`);

      return {
        success: true,
        roomId,
        participants: existingParticipants,
      };
    } catch (error) {
      this.logger.error(`Join room error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const { roomId } = data;
    const userId = client.userId;

    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    await client.leave(roomId);
    client.roomId = null;

    const roomParticipants = this.roomParticipants.get(roomId);
    if (roomParticipants) {
      roomParticipants.delete(userId);
    }

    // Notify others
    this.server.to(roomId).emit('user-left', {
      userId,
      roomId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`User ${userId} left room ${roomId}`);

    return { success: true };
  }

  // ===================== WEBRTC SIGNALING =====================

  @SubscribeMessage('signal')
  async handleSignal(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() message: SignalingMessage,
  ) {
    const { targetUserId, type, payload } = message;
    const fromUserId = client.userId;

    if (!fromUserId) {
      return { success: false, error: 'Not authenticated' };
    }

    const targetSocketId = this.userSocketMap.get(targetUserId);
    
    if (!targetSocketId) {
      this.logger.warn(`Target user ${targetUserId} not connected`);
      return { success: false, error: 'Target user not connected' };
    }

    // Forward the signaling message to target
    this.server.to(targetSocketId).emit('signal', {
      fromUserId,
      type,
      payload,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`Signal ${type} from ${fromUserId} to ${targetUserId}`);

    return { success: true };
  }

  @SubscribeMessage('offer')
  async handleOffer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { targetUserId: number; sdp: RTCSessionDescriptionInit },
  ) {
    return this.handleSignal(client, {
      targetUserId: data.targetUserId,
      type: 'offer',
      payload: data.sdp,
    });
  }

  @SubscribeMessage('answer')
  async handleAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { targetUserId: number; sdp: RTCSessionDescriptionInit },
  ) {
    return this.handleSignal(client, {
      targetUserId: data.targetUserId,
      type: 'answer',
      payload: data.sdp,
    });
  }

  @SubscribeMessage('ice-candidate')
  async handleIceCandidate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { targetUserId: number; candidate: RTCIceCandidate },
  ) {
    return this.handleSignal(client, {
      targetUserId: data.targetUserId,
      type: 'ice-candidate',
      payload: data.candidate,
    });
  }

  // ===================== MEDIA STATE =====================

  @SubscribeMessage('media-state')
  async handleMediaState(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() state: MediaStateMessage,
  ) {
    const userId = client.userId;
    const { roomId, audio, video, screen } = state;

    if (!userId || !roomId) {
      return { success: false, error: 'Invalid state' };
    }

    // Broadcast media state to all in room
    client.to(roomId).emit('media-state-changed', {
      userId,
      audio,
      video,
      screen,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  @SubscribeMessage('screen-share-start')
  async handleScreenShareStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = client.userId;
    
    client.to(data.roomId).emit('screen-share-started', {
      userId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`User ${userId} started screen sharing in room ${data.roomId}`);
    return { success: true };
  }

  @SubscribeMessage('screen-share-stop')
  async handleScreenShareStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = client.userId;
    
    client.to(data.roomId).emit('screen-share-stopped', {
      userId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`User ${userId} stopped screen sharing in room ${data.roomId}`);
    return { success: true };
  }

  // ===================== HOST CONTROLS =====================

  @SubscribeMessage('mute-participant')
  async handleMuteParticipant(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; targetUserId: number; mute: boolean },
  ) {
    const hostId = client.userId;
    const targetSocketId = this.userSocketMap.get(data.targetUserId);

    if (targetSocketId) {
      this.server.to(targetSocketId).emit('force-mute', {
        fromHostId: hostId,
        mute: data.mute,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Host ${hostId} ${data.mute ? 'muted' : 'unmuted'} user ${data.targetUserId}`);
    }

    return { success: true };
  }

  @SubscribeMessage('kick-participant')
  async handleKickParticipant(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; targetUserId: number; sessionId: number },
  ) {
    const hostId = client.userId;
    const targetSocketId = this.userSocketMap.get(data.targetUserId);

    if (targetSocketId) {
      // Notify the kicked user
      this.server.to(targetSocketId).emit('kicked', {
        fromHostId: hostId,
        reason: 'Bạn đã bị kick khỏi phiên học',
        timestamp: new Date().toISOString(),
      });

      // Force disconnect from room
      const targetSocket = this.server.sockets.sockets.get(targetSocketId) as AuthenticatedSocket;
      if (targetSocket) {
        await targetSocket.leave(data.roomId);
        targetSocket.roomId = null;
      }

      // Notify room
      this.server.to(data.roomId).emit('participant-kicked', {
        userId: data.targetUserId,
        byHostId: hostId,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Host ${hostId} kicked user ${data.targetUserId} from room ${data.roomId}`);
    }

    return { success: true };
  }

  @SubscribeMessage('end-session')
  async handleEndSession(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; sessionId: number },
  ) {
    const hostId = client.userId;

    // Notify all participants
    this.server.to(data.roomId).emit('session-ended', {
      byHostId: hostId,
      message: 'Phiên học đã kết thúc',
      timestamp: new Date().toISOString(),
    });

    // Clean up room
    this.roomParticipants.delete(data.roomId);

    this.logger.log(`Session ${data.sessionId} ended by host ${hostId}`);

    return { success: true };
  }

  // ===================== CONNECTION QUALITY =====================

  @SubscribeMessage('connection-quality')
  async handleConnectionQuality(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; sessionId: number; quality: ConnectionQuality },
  ) {
    const userId = client.userId;

    // Update in database
    await this.liveSessionsService.updateConnectionQuality(
      data.sessionId,
      { id: userId } as any,
      data.quality,
    );

    // Broadcast to room (for UI indicators)
    client.to(data.roomId).emit('participant-quality', {
      userId,
      quality: data.quality,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  // ===================== CHAT IN SESSION =====================

  @SubscribeMessage('chat-message')
  async handleChatMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; message: string; type?: string },
  ) {
    const userId = client.userId;

    // Broadcast to room
    this.server.to(data.roomId).emit('chat-message', {
      userId,
      message: data.message,
      type: data.type || 'text',
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  // ===================== UTILITY METHODS =====================

  /**
   * Get participants in a room
   */
  getRoomParticipants(roomId: string): number[] {
    const participants = this.roomParticipants.get(roomId);
    return participants ? Array.from(participants) : [];
  }

  /**
   * Check if user is in room
   */
  isUserInRoom(roomId: string, userId: number): boolean {
    const participants = this.roomParticipants.get(roomId);
    return participants ? participants.has(userId) : false;
  }

  /**
   * Broadcast to room (for external use)
   */
  broadcastToRoom(roomId: string, event: string, data: any) {
    this.server.to(roomId).emit(event, data);
  }

  /**
   * Send to specific user
   */
  sendToUser(userId: number, event: string, data: any) {
    const socketId = this.userSocketMap.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }
}
