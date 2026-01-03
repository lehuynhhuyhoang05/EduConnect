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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@modules/users/entities/user.entity';
import { NotificationsService } from './notifications.service';
import { NotificationResponseDto } from './dto';
import { FileLoggerService } from '@common/logger/file-logger.service';

/**
 * Notifications WebSocket Gateway
 * Delivers real-time notifications to connected clients
 * 
 * Events:
 * - notify:connect - Client connected
 * - notify:disconnect - Client disconnected
 * - notify:new - New notification received
 * - notify:read - Notification marked as read
 * - notify:count - Updated unread count
 */
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  // User ID -> Socket ID mapping for targeted notifications
  private connectedUsers: Map<number, Set<string>> = new Map();

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly fileLogger: FileLoggerService,
  ) {
    this.logger.log('Notifications WebSocket Gateway initialized');
  }

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

      // Store user-socket mapping
      client.data.user = user;
      const userSockets = this.connectedUsers.get(user.id) || new Set();
      userSockets.add(client.id);
      this.connectedUsers.set(user.id, userSockets);

      this.logger.log(`Notifications client connected: ${user.email} (${client.id})`);

      // Send unread count on connect
      const count = await this.notificationsService.getCount(user.id);
      client.emit('notify:count', count);
    } catch (error) {
      this.logger.warn(`Notifications connection failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const user = client.data.user as User;
    if (user) {
      const userSockets = this.connectedUsers.get(user.id);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(user.id);
        }
      }
      this.logger.log(`Notifications client disconnected: ${user.email}`);
    }
  }

  /**
   * Get notifications with pagination
   */
  @SubscribeMessage('notify:get')
  async handleGetNotifications(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { page?: number; limit?: number; unreadOnly?: boolean },
  ): Promise<void> {
    const user = client.data.user as User;
    if (!user) {
      throw new WsException('Unauthorized');
    }

    try {
      const result = await this.notificationsService.getNotifications(user.id, data);
      client.emit('notify:list', result);
    } catch (error) {
      client.emit('notify:error', { message: error.message });
    }
  }

  /**
   * Mark notifications as read
   */
  @SubscribeMessage('notify:mark-read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationIds: number[] },
  ): Promise<void> {
    const user = client.data.user as User;
    if (!user) {
      throw new WsException('Unauthorized');
    }

    try {
      const count = await this.notificationsService.markAsRead(user.id, data);
      const newCount = await this.notificationsService.getCount(user.id);

      // Update all user's connected clients
      this.notifyUser(user.id, 'notify:read', { 
        notificationIds: data.notificationIds,
        count,
      });
      this.notifyUser(user.id, 'notify:count', newCount);
    } catch (error) {
      client.emit('notify:error', { message: error.message });
    }
  }

  /**
   * Mark all notifications as read
   */
  @SubscribeMessage('notify:mark-all-read')
  async handleMarkAllAsRead(
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    const user = client.data.user as User;
    if (!user) {
      throw new WsException('Unauthorized');
    }

    try {
      const count = await this.notificationsService.markAllAsRead(user.id);
      
      // Update all user's connected clients
      this.notifyUser(user.id, 'notify:all-read', { count });
      this.notifyUser(user.id, 'notify:count', { total: 0, unread: 0 });
    } catch (error) {
      client.emit('notify:error', { message: error.message });
    }
  }

  /**
   * Delete a notification
   */
  @SubscribeMessage('notify:delete')
  async handleDeleteNotification(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: number },
  ): Promise<void> {
    const user = client.data.user as User;
    if (!user) {
      throw new WsException('Unauthorized');
    }

    try {
      await this.notificationsService.delete(data.notificationId, user.id);
      const newCount = await this.notificationsService.getCount(user.id);

      // Update all user's connected clients
      this.notifyUser(user.id, 'notify:deleted', { notificationId: data.notificationId });
      this.notifyUser(user.id, 'notify:count', newCount);
    } catch (error) {
      client.emit('notify:error', { message: error.message });
    }
  }

  // ===================== PUBLIC METHODS FOR OTHER SERVICES =====================

  /**
   * Send a notification to a specific user in real-time
   */
  sendNotification(userId: number, notification: NotificationResponseDto): void {
    this.notifyUser(userId, 'notify:new', notification);

    // Also update count
    this.notificationsService.getCount(userId).then((count) => {
      this.notifyUser(userId, 'notify:count', count);
    });

    this.fileLogger.notifications('log', 'Real-time notification sent', {
      userId,
      notificationId: notification.id,
      type: notification.type,
    });
  }

  /**
   * Send notifications to multiple users
   */
  sendBulkNotifications(userIds: number[], notification: Omit<NotificationResponseDto, 'id'>): void {
    for (const userId of userIds) {
      this.notifyUser(userId, 'notify:new', notification);
    }
  }

  /**
   * Check if a user is currently connected
   */
  isUserOnline(userId: number): boolean {
    const sockets = this.connectedUsers.get(userId);
    return !!sockets && sockets.size > 0;
  }

  /**
   * Get count of online users
   */
  getOnlineUsersCount(): number {
    return this.connectedUsers.size;
  }

  // ===================== PRIVATE HELPERS =====================

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

  private notifyUser(userId: number, event: string, data: any): void {
    const userSockets = this.connectedUsers.get(userId);
    if (!userSockets) return;

    for (const socketId of userSockets) {
      this.server.to(socketId).emit(event, data);
    }
  }
}
