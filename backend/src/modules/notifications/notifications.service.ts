import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan } from 'typeorm';
import { Notification, NotificationType, NotificationPriority } from './entities';
import {
  CreateNotificationDto,
  CreateBulkNotificationsDto,
  GetNotificationsDto,
  MarkAsReadDto,
  NotificationResponseDto,
  NotificationCountDto,
} from './dto';
import { User } from '@modules/users/entities/user.entity';
import { FileLoggerService } from '@common/logger/file-logger.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly fileLogger: FileLoggerService,
  ) {}

  /**
   * Create a single notification
   */
  async create(dto: CreateNotificationDto): Promise<Notification> {
    this.fileLogger.notifications('log', 'Creating notification', {
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
    });

    const notification = this.notificationRepository.create({
      ...dto,
      priority: dto.priority || NotificationPriority.NORMAL,
    });

    const saved = await this.notificationRepository.save(notification);

    this.fileLogger.notifications('log', 'Notification created', {
      notificationId: saved.id,
      userId: dto.userId,
    });

    return saved;
  }

  /**
   * Create notifications for multiple users (broadcast)
   */
  async createBulk(dto: CreateBulkNotificationsDto): Promise<Notification[]> {
    this.fileLogger.notifications('log', 'Creating bulk notifications', {
      userCount: dto.userIds.length,
      type: dto.type,
    });

    const notifications = dto.userIds.map((userId) =>
      this.notificationRepository.create({
        userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        priority: dto.priority || NotificationPriority.NORMAL,
        data: dto.data,
        relatedEntityType: dto.relatedEntityType,
        relatedEntityId: dto.relatedEntityId,
        actionUrl: dto.actionUrl,
      }),
    );

    const saved = await this.notificationRepository.save(notifications);

    this.fileLogger.notifications('log', 'Bulk notifications created', {
      count: saved.length,
    });

    return saved;
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: number,
    query: GetNotificationsDto,
  ): Promise<{ notifications: NotificationResponseDto[]; total: number; unread: number }> {
    const { page = 1, limit = 20, unreadOnly, type, priority } = query;

    const whereClause: any = { userId };

    if (unreadOnly) {
      whereClause.isRead = false;
    }

    if (type) {
      whereClause.type = type;
    }

    if (priority) {
      whereClause.priority = priority;
    }

    const [notifications, total] = await this.notificationRepository.findAndCount({
      where: whereClause,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const unread = await this.notificationRepository.count({
      where: { userId, isRead: false },
    });

    return {
      notifications: notifications.map(this.toResponseDto),
      total,
      unread,
    };
  }

  /**
   * Get a single notification
   */
  async getNotification(id: number, userId: number): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Không tìm thấy thông báo');
    }

    return this.toResponseDto(notification);
  }

  /**
   * Mark notification(s) as read
   */
  async markAsRead(userId: number, dto: MarkAsReadDto): Promise<number> {
    const result = await this.notificationRepository.update(
      { id: In(dto.notificationIds), userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    this.fileLogger.notifications('log', 'Notifications marked as read', {
      userId,
      count: result.affected,
    });

    return result.affected || 0;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: number): Promise<number> {
    const result = await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    this.fileLogger.notifications('log', 'All notifications marked as read', {
      userId,
      count: result.affected,
    });

    return result.affected || 0;
  }

  /**
   * Delete a notification
   */
  async delete(id: number, userId: number): Promise<boolean> {
    const result = await this.notificationRepository.delete({ id, userId });

    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy thông báo');
    }

    this.fileLogger.notifications('log', 'Notification deleted', {
      notificationId: id,
      userId,
    });

    return true;
  }

  /**
   * Delete all notifications for a user
   */
  async deleteAll(userId: number): Promise<number> {
    const result = await this.notificationRepository.delete({ userId });

    this.fileLogger.notifications('log', 'All notifications deleted', {
      userId,
      count: result.affected,
    });

    return result.affected || 0;
  }

  /**
   * Get notification count for a user
   */
  async getCount(userId: number): Promise<NotificationCountDto> {
    const [total, unread] = await Promise.all([
      this.notificationRepository.count({ where: { userId } }),
      this.notificationRepository.count({ where: { userId, isRead: false } }),
    ]);

    return { total, unread };
  }

  /**
   * Delete old notifications (for cleanup)
   */
  async deleteOldNotifications(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.notificationRepository.delete({
      createdAt: LessThan(cutoffDate),
      isRead: true,
    });

    this.fileLogger.notifications('log', 'Old notifications cleaned up', {
      count: result.affected,
      daysOld,
    });

    return result.affected || 0;
  }

  // ===================== HELPER METHODS =====================

  /**
   * Create notification for assignment events
   */
  async notifyAssignment(
    userId: number,
    type: NotificationType,
    assignmentTitle: string,
    assignmentId: number,
    classId: number,
    additionalData?: Record<string, any>,
  ): Promise<Notification> {
    const messages: Record<NotificationType, string> = {
      [NotificationType.ASSIGNMENT_CREATED]: `Bài tập mới: ${assignmentTitle}`,
      [NotificationType.ASSIGNMENT_UPDATED]: `Bài tập "${assignmentTitle}" đã được cập nhật`,
      [NotificationType.ASSIGNMENT_DUE_SOON]: `Bài tập "${assignmentTitle}" sắp đến hạn`,
      [NotificationType.ASSIGNMENT_OVERDUE]: `Bài tập "${assignmentTitle}" đã quá hạn`,
      [NotificationType.SUBMISSION_RECEIVED]: `Có bài nộp mới cho "${assignmentTitle}"`,
      [NotificationType.SUBMISSION_GRADED]: `Bài tập "${assignmentTitle}" đã được chấm điểm`,
      [NotificationType.SUBMISSION_RETURNED]: `Bài tập "${assignmentTitle}" đã được trả lại`,
    } as any;

    return this.create({
      userId,
      type,
      title: 'Thông báo bài tập',
      message: messages[type] || `Có cập nhật về bài tập "${assignmentTitle}"`,
      data: { assignmentId, classId, ...additionalData },
      relatedEntityType: 'assignment',
      relatedEntityId: String(assignmentId),
      actionUrl: `/classes/${classId}/assignments/${assignmentId}`,
      priority: type === NotificationType.ASSIGNMENT_OVERDUE
        ? NotificationPriority.HIGH
        : NotificationPriority.NORMAL,
    });
  }

  /**
   * Create notification for class events
   */
  async notifyClass(
    userId: number,
    type: NotificationType,
    className: string,
    classId: number,
    additionalData?: Record<string, any>,
  ): Promise<Notification> {
    const messages: Record<NotificationType, string> = {
      [NotificationType.CLASS_JOINED]: `Bạn đã tham gia lớp "${className}"`,
      [NotificationType.CLASS_INVITATION]: `Bạn được mời tham gia lớp "${className}"`,
      [NotificationType.CLASS_UPDATED]: `Lớp "${className}" đã được cập nhật`,
      [NotificationType.CLASS_DELETED]: `Lớp "${className}" đã bị xóa`,
      [NotificationType.MEMBER_JOINED]: `Có thành viên mới tham gia lớp "${className}"`,
      [NotificationType.MEMBER_LEFT]: `Một thành viên đã rời lớp "${className}"`,
      [NotificationType.MEMBER_REMOVED]: `Bạn đã bị xóa khỏi lớp "${className}"`,
    } as any;

    return this.create({
      userId,
      type,
      title: 'Thông báo lớp học',
      message: messages[type] || `Có cập nhật về lớp "${className}"`,
      data: { classId, ...additionalData },
      relatedEntityType: 'class',
      relatedEntityId: String(classId),
      actionUrl: `/classes/${classId}`,
    });
  }

  /**
   * Create notification for live session events
   */
  async notifySession(
    userId: number,
    type: NotificationType,
    sessionTitle: string,
    sessionId: number,
    classId: number,
    additionalData?: Record<string, any>,
  ): Promise<Notification> {
    const messages: Record<NotificationType, string> = {
      [NotificationType.SESSION_SCHEDULED]: `Phiên học "${sessionTitle}" đã được lên lịch`,
      [NotificationType.SESSION_STARTING_SOON]: `Phiên học "${sessionTitle}" sắp bắt đầu`,
      [NotificationType.SESSION_STARTED]: `Phiên học "${sessionTitle}" đang diễn ra`,
      [NotificationType.SESSION_ENDED]: `Phiên học "${sessionTitle}" đã kết thúc`,
      [NotificationType.SESSION_CANCELLED]: `Phiên học "${sessionTitle}" đã bị hủy`,
    } as any;

    return this.create({
      userId,
      type,
      title: 'Thông báo phiên học',
      message: messages[type] || `Có cập nhật về phiên học "${sessionTitle}"`,
      data: { sessionId, classId, ...additionalData },
      relatedEntityType: 'live_session',
      relatedEntityId: String(sessionId),
      actionUrl: `/sessions/${sessionId}`,
      priority: type === NotificationType.SESSION_STARTING_SOON
        ? NotificationPriority.HIGH
        : NotificationPriority.NORMAL,
    });
  }

  /**
   * Create notification for chat mentions
   */
  async notifyMention(
    userId: number,
    mentionedBy: string,
    roomId: string,
    roomType: string,
    messagePreview: string,
  ): Promise<Notification> {
    return this.create({
      userId,
      type: NotificationType.MENTIONED,
      title: 'Ai đó đã nhắc đến bạn',
      message: `${mentionedBy} đã nhắc đến bạn: "${messagePreview}"`,
      data: { roomId, roomType, mentionedBy },
      relatedEntityType: roomType,
      relatedEntityId: roomId,
      actionUrl: `/${roomType}/${roomId}/chat`,
      priority: NotificationPriority.HIGH,
    });
  }

  private toResponseDto(notification: Notification): NotificationResponseDto {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      data: notification.data,
      isRead: notification.isRead,
      readAt: notification.readAt,
      relatedEntityType: notification.relatedEntityType,
      relatedEntityId: notification.relatedEntityId,
      actionUrl: notification.actionUrl,
      createdAt: notification.createdAt,
    };
  }
}
