import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '@modules/users/entities/user.entity';

/**
 * Notification Types
 */
export enum NotificationType {
  // Class notifications
  CLASS_JOINED = 'class_joined',
  CLASS_INVITATION = 'class_invitation',
  CLASS_UPDATED = 'class_updated',
  CLASS_DELETED = 'class_deleted',
  MEMBER_JOINED = 'member_joined',
  MEMBER_LEFT = 'member_left',
  MEMBER_REMOVED = 'member_removed',

  // Assignment notifications
  ASSIGNMENT_CREATED = 'assignment_created',
  ASSIGNMENT_UPDATED = 'assignment_updated',
  ASSIGNMENT_DUE_SOON = 'assignment_due_soon',
  ASSIGNMENT_OVERDUE = 'assignment_overdue',
  SUBMISSION_RECEIVED = 'submission_received',
  SUBMISSION_GRADED = 'submission_graded',
  SUBMISSION_RETURNED = 'submission_returned',

  // Live session notifications
  SESSION_SCHEDULED = 'session_scheduled',
  SESSION_STARTING_SOON = 'session_starting_soon',
  SESSION_STARTED = 'session_started',
  SESSION_ENDED = 'session_ended',
  SESSION_CANCELLED = 'session_cancelled',

  // Chat notifications
  NEW_MESSAGE = 'new_message',
  MENTIONED = 'mentioned',

  // System notifications
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  ACCOUNT_UPDATED = 'account_updated',
}

/**
 * Notification Priority
 */
export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Notification Entity
 * Stores notifications for users
 */
@Entity('notifications')
@Index(['userId', 'isRead'])
@Index(['userId', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'int', unsigned: true })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.NORMAL,
  })
  priority: NotificationPriority;

  @Column({ type: 'json', nullable: true })
  data: Record<string, any>;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ nullable: true })
  relatedEntityType: string;

  @Column({ nullable: true })
  relatedEntityId: string;

  @Column({ nullable: true, length: 500 })
  actionUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
