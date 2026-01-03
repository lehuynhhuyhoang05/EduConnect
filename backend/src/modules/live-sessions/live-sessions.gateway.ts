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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { LiveSessionsService } from './live-sessions.service';
import { ConnectionQuality } from './entities';
import { User } from '@modules/users/entities/user.entity';
import { FileLoggerService } from '@common/logger/file-logger.service';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  roomId?: string;
}

interface SignalingMessage {
  roomId: string;
  targetUserId: number;
  type: 'offer' | 'answer' | 'ice-candidate';
  sdp?: any;
  candidate?: any;
  payload?: any; // Generic payload for signal forwarding
}

interface MediaStateMessage {
  roomId: string;
  audio: boolean;
  video: boolean;
  screen?: boolean;
}

interface WaitingUser {
  userId: number;
  socketId: string;
  userName?: string;
  requestedAt: Date;
}

interface HandRaiseInfo {
  userId: number;
  raisedAt: Date;
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
  // Map roomId -> waiting room users
  private waitingRoom = new Map<string, WaitingUser[]>();
  // Map roomId -> rooms that have waiting room enabled
  private waitingRoomEnabled = new Map<string, boolean>();
  // Map roomId -> users with raised hands
  private raisedHands = new Map<string, HandRaiseInfo[]>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly liveSessionsService: LiveSessionsService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly fileLogger: FileLoggerService,
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

      // Remove from waiting room if present
      if (client.roomId) {
        const waitingUsers = this.waitingRoom.get(client.roomId);
        if (waitingUsers) {
          const index = waitingUsers.findIndex(u => u.userId === userId);
          if (index > -1) {
            waitingUsers.splice(index, 1);
          }
        }

        // Remove raised hand if present
        const raisedHands = this.raisedHands.get(client.roomId);
        if (raisedHands) {
          const handIndex = raisedHands.findIndex(h => h.userId === userId);
          if (handIndex > -1) {
            raisedHands.splice(handIndex, 1);
            // Notify room about lowered hand
            this.server.to(client.roomId).emit('hand-lowered', {
              userId,
              timestamp: new Date().toISOString(),
            });
          }
        }
      }

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
    @MessageBody() data: { roomId: string; sessionId: number; userName?: string },
  ) {
    const { roomId, sessionId, userName } = data;
    const userId = client.userId;

    if (!userId) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Check if waiting room is enabled and user is not host
      const session = await this.liveSessionsService.findById(sessionId);
      const isHost = session && session.hostId === userId;
      
      if (this.waitingRoomEnabled.get(roomId) && !isHost) {
        // Add to waiting room
        if (!this.waitingRoom.has(roomId)) {
          this.waitingRoom.set(roomId, []);
        }
        
        const waitingUsers = this.waitingRoom.get(roomId);
        const alreadyWaiting = waitingUsers.some(u => u.userId === userId);
        
        if (!alreadyWaiting) {
          waitingUsers.push({
            userId,
            socketId: client.id,
            userName,
            requestedAt: new Date(),
          });
          
          // Notify host about new waiting user
          const hostSocketId = this.userSocketMap.get(session.hostId);
          if (hostSocketId) {
            this.server.to(hostSocketId).emit('user-waiting', {
              userId,
              userName,
              socketId: client.id,
              roomId,
              timestamp: new Date().toISOString(),
            });
          }
          
          this.logger.log(`User ${userId} added to waiting room for ${roomId}`);
        }
        
        return {
          success: true,
          waiting: true,
          message: 'Đang chờ host chấp nhận',
        };
      }

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
      roomId: client.roomId || '',
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
      roomId: client.roomId || '',
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
      roomId: client.roomId || '',
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

    // Get user info
    const user = await this.userRepository.findOne({ where: { id: userId } });

    // Broadcast media state to all in room (including sender for confirmation)
    const payload = {
      userId,
      userName: user?.fullName || `User ${userId}`,
      audio,
      video,
      screen,
      timestamp: new Date().toISOString(),
    };

    // Broadcast to others
    client.to(roomId).emit('media-state-updated', payload);
    
    // Also emit back to sender for confirmation
    client.emit('media-state-updated', payload);

    this.logger.log(`[MEDIA] User ${userId} (${user?.fullName}): Mic=${audio}, Cam=${video}, Screen=${screen} in room ${roomId}`);

    return { success: true, state: payload };
  }

  @SubscribeMessage('screen-share-start')
  async handleScreenShareStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = client.userId;
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    const payload = {
      userId,
      userName: user?.fullName || `User ${userId}`,
      timestamp: new Date().toISOString(),
    };

    client.to(data.roomId).emit('screen-share-started', payload);

    this.logger.log(`[SCREEN SHARE] User ${userId} (${user?.fullName}) STARTED screen sharing in room ${data.roomId}`);
    this.fileLogger.liveSessions('log', 'Screen share started', {
      userId,
      userName: user?.fullName,
      roomId: data.roomId,
    });

    return { success: true, message: 'Screen share started' };
  }

  @SubscribeMessage('screen-share-stop')
  async handleScreenShareStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = client.userId;
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    const payload = {
      userId,
      userName: user?.fullName || `User ${userId}`,
      timestamp: new Date().toISOString(),
    };

    client.to(data.roomId).emit('screen-share-stopped', payload);

    this.logger.log(`[SCREEN SHARE] User ${userId} (${user?.fullName}) STOPPED screen sharing in room ${data.roomId}`);
    this.fileLogger.liveSessions('log', 'Screen share stopped', {
      userId,
      userName: user?.fullName,
      roomId: data.roomId,
    });

    return { success: true, message: 'Screen share stopped' };
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
    this.waitingRoom.delete(data.roomId);
    this.waitingRoomEnabled.delete(data.roomId);
    this.raisedHands.delete(data.roomId);

    this.logger.log(`Session ${data.sessionId} ended by host ${hostId}`);

    return { success: true };
  }

  // ===================== HAND RAISE =====================

  @SubscribeMessage('raise-hand')
  async handleRaiseHand(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const userId = client.userId;
    const { roomId } = data;

    if (!userId || !roomId) {
      return { success: false, error: 'Invalid request' };
    }

    // Initialize raised hands for room if not exists
    if (!this.raisedHands.has(roomId)) {
      this.raisedHands.set(roomId, []);
    }

    const hands = this.raisedHands.get(roomId);
    const alreadyRaised = hands.some(h => h.userId === userId);

    if (!alreadyRaised) {
      hands.push({
        userId,
        raisedAt: new Date(),
      });

      // Broadcast to room
      this.server.to(roomId).emit('hand-raised', {
        userId,
        timestamp: new Date().toISOString(),
        order: hands.length, // Position in queue
      });

      this.logger.log(`User ${userId} raised hand in room ${roomId}`);
    }

    return { success: true, order: hands.length };
  }

  @SubscribeMessage('lower-hand')
  async handleLowerHand(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; targetUserId?: number },
  ) {
    const userId = client.userId;
    const { roomId, targetUserId } = data;
    const targetId = targetUserId || userId; // Host can lower others' hands

    if (!roomId) {
      return { success: false, error: 'Invalid request' };
    }

    const hands = this.raisedHands.get(roomId);
    if (hands) {
      const index = hands.findIndex(h => h.userId === targetId);
      if (index > -1) {
        hands.splice(index, 1);

        // Broadcast to room
        this.server.to(roomId).emit('hand-lowered', {
          userId: targetId,
          byUserId: userId,
          timestamp: new Date().toISOString(),
        });

        this.logger.log(`Hand lowered for user ${targetId} in room ${roomId}`);
      }
    }

    return { success: true };
  }

  @SubscribeMessage('get-raised-hands')
  async handleGetRaisedHands(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const hands = this.raisedHands.get(data.roomId) || [];
    return { 
      success: true, 
      hands: hands.map((h, index) => ({
        userId: h.userId,
        raisedAt: h.raisedAt.toISOString(),
        order: index + 1,
      })),
    };
  }

  // ===================== MUTE ALL =====================

  @SubscribeMessage('mute-all')
  async handleMuteAll(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; mute: boolean; exceptHost?: boolean },
  ) {
    const hostId = client.userId;
    const { roomId, mute, exceptHost = true } = data;

    // Get all participants in room
    const participants = this.roomParticipants.get(roomId);
    if (!participants) {
      return { success: false, error: 'Room not found' };
    }

    // Notify each participant
    for (const participantId of participants) {
      // Skip host if exceptHost is true
      if (exceptHost && participantId === hostId) continue;

      const socketId = this.userSocketMap.get(participantId);
      if (socketId) {
        this.server.to(socketId).emit('force-mute', {
          fromHostId: hostId,
          mute,
          isGlobal: true,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Broadcast to room that mute all was triggered
    this.server.to(roomId).emit('mute-all-triggered', {
      byHostId: hostId,
      mute,
      exceptHost,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Host ${hostId} ${mute ? 'muted' : 'unmuted'} all in room ${roomId}`);

    return { success: true, affectedCount: exceptHost ? participants.size - 1 : participants.size };
  }

  // ===================== DISABLE CAMERA =====================

  @SubscribeMessage('disable-camera')
  async handleDisableCamera(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; targetUserId: number; disable: boolean },
  ) {
    const hostId = client.userId;
    const { roomId, targetUserId, disable } = data;

    const targetSocketId = this.userSocketMap.get(targetUserId);

    if (targetSocketId) {
      // Notify the target user to disable camera
      this.server.to(targetSocketId).emit('force-disable-camera', {
        fromHostId: hostId,
        disable,
        timestamp: new Date().toISOString(),
      });

      // Notify room about camera state change
      this.server.to(roomId).emit('participant-camera-disabled', {
        userId: targetUserId,
        byHostId: hostId,
        disabled: disable,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Host ${hostId} ${disable ? 'disabled' : 'enabled'} camera for user ${targetUserId}`);
    }

    return { success: true };
  }

  @SubscribeMessage('disable-all-cameras')
  async handleDisableAllCameras(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; disable: boolean; exceptHost?: boolean },
  ) {
    const hostId = client.userId;
    const { roomId, disable, exceptHost = true } = data;

    const participants = this.roomParticipants.get(roomId);
    if (!participants) {
      return { success: false, error: 'Room not found' };
    }

    for (const participantId of participants) {
      if (exceptHost && participantId === hostId) continue;

      const socketId = this.userSocketMap.get(participantId);
      if (socketId) {
        this.server.to(socketId).emit('force-disable-camera', {
          fromHostId: hostId,
          disable,
          isGlobal: true,
          timestamp: new Date().toISOString(),
        });
      }
    }

    this.server.to(roomId).emit('disable-all-cameras-triggered', {
      byHostId: hostId,
      disabled: disable,
      exceptHost,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Host ${hostId} ${disable ? 'disabled' : 'enabled'} all cameras in room ${roomId}`);

    return { success: true };
  }

  // ===================== WAITING ROOM =====================

  @SubscribeMessage('enable-waiting-room')
  async handleEnableWaitingRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; enabled: boolean },
  ) {
    const hostId = client.userId;
    const { roomId, enabled } = data;

    this.waitingRoomEnabled.set(roomId, enabled);

    // Notify room about waiting room status
    this.server.to(roomId).emit('waiting-room-status', {
      enabled,
      byHostId: hostId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Host ${hostId} ${enabled ? 'enabled' : 'disabled'} waiting room for ${roomId}`);

    // If disabled, admit all waiting users
    if (!enabled) {
      const waitingUsers = this.waitingRoom.get(roomId) || [];
      for (const user of waitingUsers) {
        await this.admitUserFromWaitingRoom(roomId, user.userId, hostId);
      }
      this.waitingRoom.set(roomId, []);
    }

    return { success: true };
  }

  @SubscribeMessage('get-waiting-users')
  async handleGetWaitingUsers(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const waitingUsers = this.waitingRoom.get(data.roomId) || [];
    return {
      success: true,
      users: waitingUsers.map(u => ({
        userId: u.userId,
        userName: u.userName,
        socketId: u.socketId,
        requestedAt: u.requestedAt.toISOString(),
      })),
    };
  }

  @SubscribeMessage('admit-user')
  async handleAdmitUser(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; targetUserId: number },
  ) {
    const hostId = client.userId;
    const { roomId, targetUserId } = data;

    const result = await this.admitUserFromWaitingRoom(roomId, targetUserId, hostId);
    return result;
  }

  @SubscribeMessage('admit-all-users')
  async handleAdmitAllUsers(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    const hostId = client.userId;
    const { roomId } = data;

    const waitingUsers = this.waitingRoom.get(roomId) || [];
    let admittedCount = 0;

    for (const user of waitingUsers) {
      const result = await this.admitUserFromWaitingRoom(roomId, user.userId, hostId);
      if (result.success) admittedCount++;
    }

    this.waitingRoom.set(roomId, []);

    return { success: true, admittedCount };
  }

  @SubscribeMessage('deny-user')
  async handleDenyUser(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; targetUserId: number; reason?: string },
  ) {
    const hostId = client.userId;
    const { roomId, targetUserId, reason } = data;

    const waitingUsers = this.waitingRoom.get(roomId);
    if (!waitingUsers) {
      return { success: false, error: 'No waiting room found' };
    }

    const userIndex = waitingUsers.findIndex(u => u.userId === targetUserId);
    if (userIndex === -1) {
      return { success: false, error: 'User not in waiting room' };
    }

    const deniedUser = waitingUsers[userIndex];
    waitingUsers.splice(userIndex, 1);

    // Notify the denied user
    if (deniedUser.socketId) {
      this.server.to(deniedUser.socketId).emit('admission-denied', {
        byHostId: hostId,
        reason: reason || 'Host đã từ chối yêu cầu tham gia',
        timestamp: new Date().toISOString(),
      });
    }

    this.logger.log(`Host ${hostId} denied user ${targetUserId} from room ${roomId}`);

    return { success: true };
  }

  private async admitUserFromWaitingRoom(roomId: string, userId: number, hostId: number) {
    const waitingUsers = this.waitingRoom.get(roomId);
    if (!waitingUsers) {
      return { success: false, error: 'No waiting room found' };
    }

    const userIndex = waitingUsers.findIndex(u => u.userId === userId);
    if (userIndex === -1) {
      return { success: false, error: 'User not in waiting room' };
    }

    const admittedUser = waitingUsers[userIndex];
    waitingUsers.splice(userIndex, 1);

    // Get the user's socket and admit them to the room
    const userSocket = this.server.sockets.sockets.get(admittedUser.socketId) as AuthenticatedSocket;
    if (userSocket) {
      await userSocket.join(roomId);
      userSocket.roomId = roomId;

      // Track participant
      if (!this.roomParticipants.has(roomId)) {
        this.roomParticipants.set(roomId, new Set());
      }
      this.roomParticipants.get(roomId).add(userId);

      // Notify the admitted user
      userSocket.emit('admission-granted', {
        byHostId: hostId,
        roomId,
        timestamp: new Date().toISOString(),
      });

      // Get existing participants
      const existingParticipants = Array.from(this.roomParticipants.get(roomId))
        .filter(id => id !== userId)
        .map(id => ({
          userId: id,
          socketId: this.userSocketMap.get(id),
        }));

      // Send participants list to admitted user
      userSocket.emit('room-joined', {
        roomId,
        participants: existingParticipants,
      });

      // Notify others in room
      this.server.to(roomId).emit('user-joined', {
        userId,
        userName: admittedUser.userName,
        socketId: admittedUser.socketId,
        roomId,
        fromWaitingRoom: true,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Host ${hostId} admitted user ${userId} to room ${roomId}`);
    }

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

  // ===================== WEBRTC SIGNALING =====================

  @SubscribeMessage('webrtc-offer')
  async handleWebRTCOffer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SignalingMessage,
  ) {
    const fromUserId = client.userId;
    const { roomId, targetUserId, sdp } = data;

    if (!fromUserId || !roomId || !targetUserId || !sdp) {
      return { success: false, error: 'Invalid offer data' };
    }

    const targetSocketId = this.userSocketMap.get(targetUserId);
    if (!targetSocketId) {
      this.logger.warn(`Target user ${targetUserId} not found for WebRTC offer`);
      return { success: false, error: 'Target user not connected' };
    }

    // Forward offer to target user
    this.server.to(targetSocketId).emit('webrtc-offer', {
      fromUserId,
      roomId,
      sdp,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`[WEBRTC] User ${fromUserId} sent offer to user ${targetUserId} in room ${roomId}`);
    return { success: true };
  }

  @SubscribeMessage('webrtc-answer')
  async handleWebRTCAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SignalingMessage,
  ) {
    const fromUserId = client.userId;
    const { roomId, targetUserId, sdp } = data;

    if (!fromUserId || !roomId || !targetUserId || !sdp) {
      return { success: false, error: 'Invalid answer data' };
    }

    const targetSocketId = this.userSocketMap.get(targetUserId);
    if (!targetSocketId) {
      this.logger.warn(`Target user ${targetUserId} not found for WebRTC answer`);
      return { success: false, error: 'Target user not connected' };
    }

    // Forward answer to target user
    this.server.to(targetSocketId).emit('webrtc-answer', {
      fromUserId,
      roomId,
      sdp,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`[WEBRTC] User ${fromUserId} sent answer to user ${targetUserId} in room ${roomId}`);
    return { success: true };
  }

  @SubscribeMessage('webrtc-ice-candidate')
  async handleWebRTCIceCandidate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SignalingMessage,
  ) {
    const fromUserId = client.userId;
    const { roomId, targetUserId, candidate } = data;

    if (!fromUserId || !roomId || !targetUserId || !candidate) {
      return { success: false, error: 'Invalid ICE candidate data' };
    }

    const targetSocketId = this.userSocketMap.get(targetUserId);
    if (!targetSocketId) {
      return { success: false, error: 'Target user not connected' };
    }

    // Forward ICE candidate to target user
    this.server.to(targetSocketId).emit('webrtc-ice-candidate', {
      fromUserId,
      roomId,
      candidate,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`[WEBRTC] ICE candidate from user ${fromUserId} to user ${targetUserId}`);
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
