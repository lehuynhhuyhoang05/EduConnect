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
import { CurrentUser } from '@modules/auth/decorators';
import { User } from '@modules/users/entities/user.entity';
import { NotificationsService } from './notifications.service';
import {
  GetNotificationsDto,
  MarkAsReadDto,
  NotificationResponseDto,
  NotificationCountDto,
} from './dto';

/**
 * Notifications REST Controller
 * For querying and managing notifications
 * Real-time delivery is handled by NotificationsGateway (WebSocket)
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Get notifications for current user
   */
  @Get()
  async getNotifications(
    @CurrentUser() user: User,
    @Query() query: GetNotificationsDto,
  ): Promise<{ notifications: NotificationResponseDto[]; total: number; unread: number }> {
    return this.notificationsService.getNotifications(user.id, query);
  }

  /**
   * Get unread count
   */
  @Get('count')
  async getCount(@CurrentUser() user: User): Promise<NotificationCountDto> {
    return this.notificationsService.getCount(user.id);
  }

  /**
   * Get a single notification
   */
  @Get(':id')
  async getNotification(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.getNotification(id, user.id);
  }

  /**
   * Mark notifications as read
   */
  @Post('read')
  async markAsRead(
    @Body() dto: MarkAsReadDto,
    @CurrentUser() user: User,
  ): Promise<{ markedCount: number }> {
    const count = await this.notificationsService.markAsRead(user.id, dto);
    return { markedCount: count };
  }

  /**
   * Mark all notifications as read
   */
  @Post('read-all')
  async markAllAsRead(@CurrentUser() user: User): Promise<{ markedCount: number }> {
    const count = await this.notificationsService.markAllAsRead(user.id);
    return { markedCount: count };
  }

  /**
   * Delete a notification
   */
  @Delete(':id')
  async deleteNotification(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean }> {
    await this.notificationsService.delete(id, user.id);
    return { success: true };
  }

  /**
   * Delete all notifications
   */
  @Delete()
  async deleteAllNotifications(@CurrentUser() user: User): Promise<{ deletedCount: number }> {
    const count = await this.notificationsService.deleteAll(user.id);
    return { deletedCount: count };
  }
}
