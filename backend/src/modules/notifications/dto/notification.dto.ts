import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsObject,
  IsArray,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType, NotificationPriority } from '../entities';

/**
 * DTO for creating a notification
 */
export class CreateNotificationDto {
  @IsNumber()
  userId: number;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsString()
  relatedEntityType?: string;

  @IsOptional()
  @IsString()
  relatedEntityId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  actionUrl?: string;
}

/**
 * DTO for creating multiple notifications (broadcast)
 */
export class CreateBulkNotificationsDto {
  @IsArray()
  @IsNumber({}, { each: true })
  userIds: number[];

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @IsOptional()
  @IsString()
  relatedEntityType?: string;

  @IsOptional()
  @IsString()
  relatedEntityId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  actionUrl?: string;
}

/**
 * DTO for querying notifications
 */
export class GetNotificationsDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  unreadOnly?: boolean;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;
}

/**
 * DTO for marking notifications as read
 */
export class MarkAsReadDto {
  @IsArray()
  @IsNumber({}, { each: true })
  notificationIds: number[];
}

/**
 * Notification response DTO
 */
export class NotificationResponseDto {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  data: Record<string, any>;
  isRead: boolean;
  readAt: Date | null;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  actionUrl: string | null;
  createdAt: Date;
}

/**
 * Notification count response
 */
export class NotificationCountDto {
  total: number;
  unread: number;
}
