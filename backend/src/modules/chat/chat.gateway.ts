import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/chat-message.dto';
import { RoomType } from './entities/chat-message.entity';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

interface ChatSocket extends Socket {
  user?: User;
  currentRoom?: { roomId: string; roomType: RoomType };
}

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private userSocketMap: Map<number, Set<string>> = new Map(); // userId -> socketIds
  private socketRoomMap: Map<string, { roomId: string; roomType: RoomType }> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly usersService: UsersService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Chat WebSocket Gateway initialized');
  }

  async handleConnection(client: ChatSocket) {
    try {
      // Authenticate user from handshake
      const token = client.handshake.auth?.token || 
                    client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        throw new UnauthorizedException('Token not provided');
      }

      const payload = this.jwtService.verify(token);
      const user = await this.usersService.findOne(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      client.user = user;

      // Track user's socket
      if (!this.userSocketMap.has(user.id)) {
        this.userSocketMap.set(user.id, new Set());
      }
      this.userSocketMap.get(user.id)!.add(client.id);

      this.logger.log(`Chat client connected: ${client.id} (User: ${user.fullName})`);
    } catch (error) {
      this.logger.error(`Chat connection failed: ${error.message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: ChatSocket) {
    if (client.user) {
      const userSockets = this.userSocketMap.get(client.user.id);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.userSocketMap.delete(client.user.id);
        }
      }
    }

    // Leave current room
    const room = this.socketRoomMap.get(client.id);
    if (room) {
      const roomKey = this.getRoomKey(room.roomId, room.roomType);
      client.leave(roomKey);
      this.socketRoomMap.delete(client.id);
      
      // Notify room about user leaving
      this.server.to(roomKey).emit('user-left', {
        userId: client.user?.id,
        userName: client.user?.fullName,
      });
    }

    this.logger.log(`Chat client disconnected: ${client.id}`);
  }

  /**
   * Join a chat room
   */
  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() data: { roomId: string; roomType: RoomType },
  ) {
    if (!client.user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      // Leave previous room if any
      const currentRoom = this.socketRoomMap.get(client.id);
      if (currentRoom) {
        const oldRoomKey = this.getRoomKey(currentRoom.roomId, currentRoom.roomType);
        client.leave(oldRoomKey);
      }

      // Join new room
      const roomKey = this.getRoomKey(data.roomId, data.roomType);
      client.join(roomKey);
      this.socketRoomMap.set(client.id, { roomId: data.roomId, roomType: data.roomType });

      // Get recent messages
      const messages = await this.chatService.getMessages(
        data.roomId,
        data.roomType,
        { limit: 50 },
        client.user,
      );

      // Notify room about new user
      this.server.to(roomKey).emit('user-joined', {
        userId: client.user.id,
        userName: client.user.fullName,
        avatarUrl: client.user.avatarUrl,
      });

      this.logger.log(`User ${client.user.id} joined room ${roomKey}`);

      return { 
        success: true, 
        roomId: data.roomId,
        roomType: data.roomType,
        messages: messages.data,
        hasMore: messages.hasMore,
      };
    } catch (error) {
      this.logger.error(`Failed to join room: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Leave a chat room
   */
  @SubscribeMessage('leave-room')
  async handleLeaveRoom(@ConnectedSocket() client: ChatSocket) {
    const room = this.socketRoomMap.get(client.id);
    if (room) {
      const roomKey = this.getRoomKey(room.roomId, room.roomType);
      client.leave(roomKey);
      this.socketRoomMap.delete(client.id);

      this.server.to(roomKey).emit('user-left', {
        userId: client.user?.id,
        userName: client.user?.fullName,
      });
    }

    return { success: true };
  }

  /**
   * Send a message
   */
  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() data: SendMessageDto & { roomId: string; roomType: RoomType },
  ) {
    if (!client.user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const message = await this.chatService.sendMessage(
        data.roomId,
        data.roomType,
        data,
        client.user,
      );

      // Broadcast to room
      const roomKey = this.getRoomKey(data.roomId, data.roomType);
      this.server.to(roomKey).emit('new-message', message);

      this.logger.log(`Message sent in ${roomKey} by user ${client.user.id}`);

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Failed to send message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Edit a message
   */
  @SubscribeMessage('edit-message')
  async handleEditMessage(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() data: { messageId: number; message: string },
  ) {
    if (!client.user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const updated = await this.chatService.updateMessage(
        data.messageId,
        { message: data.message },
        client.user,
      );

      // Broadcast to room
      const roomKey = this.getRoomKey(updated.roomId, updated.roomType);
      this.server.to(roomKey).emit('message-edited', updated);

      return { success: true, message: updated };
    } catch (error) {
      this.logger.error(`Failed to edit message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a message
   */
  @SubscribeMessage('delete-message')
  async handleDeleteMessage(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() data: { messageId: number; roomId: string; roomType: RoomType },
  ) {
    if (!client.user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      await this.chatService.deleteMessage(data.messageId, client.user);

      // Broadcast to room
      const roomKey = this.getRoomKey(data.roomId, data.roomType);
      this.server.to(roomKey).emit('message-deleted', { messageId: data.messageId });

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to delete message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Typing indicator
   */
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() data: { roomId: string; roomType: RoomType; isTyping: boolean },
  ) {
    if (!client.user) return;

    const roomKey = this.getRoomKey(data.roomId, data.roomType);
    client.to(roomKey).emit('user-typing', {
      userId: client.user.id,
      userName: client.user.fullName,
      isTyping: data.isTyping,
    });
  }

  /**
   * Load more messages (pagination)
   */
  @SubscribeMessage('load-more')
  async handleLoadMore(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() data: { roomId: string; roomType: RoomType; beforeId: number },
  ) {
    if (!client.user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const messages = await this.chatService.getMessages(
        data.roomId,
        data.roomType,
        { before: data.beforeId, limit: 50 },
        client.user,
      );

      return { 
        success: true, 
        messages: messages.data,
        hasMore: messages.hasMore,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // =============== HELPER METHODS ===============

  private getRoomKey(roomId: string, roomType: RoomType): string {
    return `${roomType}:${roomId}`;
  }

  /**
   * Broadcast message to a room (called from service)
   */
  broadcastToRoom(roomId: string, roomType: RoomType, event: string, data: any) {
    const roomKey = this.getRoomKey(roomId, roomType);
    this.server.to(roomKey).emit(event, data);
  }

  /**
   * Send notification to specific user
   */
  sendToUser(userId: number, event: string, data: any) {
    const userSockets = this.userSocketMap.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        this.server.to(socketId).emit(event, data);
      });
    }
  }

  /**
   * Get online users in a room
   */
  getOnlineUsersInRoom(roomId: string, roomType: RoomType): number[] {
    const roomKey = this.getRoomKey(roomId, roomType);
    const userIds: number[] = [];

    this.socketRoomMap.forEach((room, socketId) => {
      if (room.roomId === roomId && room.roomType === roomType) {
        // Find user for this socket
        this.userSocketMap.forEach((sockets, userId) => {
          if (sockets.has(socketId) && !userIds.includes(userId)) {
            userIds.push(userId);
          }
        });
      }
    });

    return userIds;
  }
}
