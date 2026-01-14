import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '@modules/users/entities/user.entity';
import { Class } from '@modules/classes/entities/class.entity';

export enum CalendarEventType {
  LIVE_SESSION = 'live_session',
  ASSIGNMENT_DUE = 'assignment_due',
  QUIZ = 'quiz',
  EXAM = 'exam',
  HOLIDAY = 'holiday',
  CLASS_EVENT = 'class_event',
  PERSONAL = 'personal',
  REMINDER = 'reminder',
}

export enum RecurrenceType {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
}

export enum ReminderTime {
  AT_TIME = 'at_time',
  FIVE_MIN = '5_min',
  FIFTEEN_MIN = '15_min',
  THIRTY_MIN = '30_min',
  ONE_HOUR = '1_hour',
  ONE_DAY = '1_day',
  ONE_WEEK = '1_week',
}

@Entity('calendar_events')
export class CalendarEvent {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ length: 300 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: CalendarEventType })
  eventType: CalendarEventType;

  @Column()
  startTime: Date;

  @Column({ nullable: true })
  endTime: Date;

  @Column({ default: false })
  allDay: boolean;

  @Column({ length: 300, nullable: true })
  location: string; // Physical location or meeting link

  @Column({ length: 7, default: '#3b82f6' })
  color: string; // Hex color for UI

  // Recurrence
  @Column({ type: 'enum', enum: RecurrenceType, default: RecurrenceType.NONE })
  recurrence: RecurrenceType;

  @Column({ nullable: true })
  recurrenceEndDate: Date;

  // Reminder
  @Column({ type: 'simple-array', nullable: true })
  reminders: ReminderTime[]; // Multiple reminders

  // Relationships
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'created_by', type: 'int', unsigned: true })
  createdById: number;

  @ManyToOne(() => Class, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @Column({ name: 'class_id', type: 'int', unsigned: true, nullable: true })
  classId: number;

  // Linked resources
  @Column({ type: 'int', unsigned: true, nullable: true })
  linkedResourceId: number; // Assignment ID, Session ID, etc.

  @Column({ nullable: true })
  linkedResourceType: string; // 'assignment', 'live_session', etc.

  // Visibility
  @Column({ default: true })
  isPublic: boolean; // Visible to all class members

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/**
 * Event Reminder - Scheduled reminders
 */
@Entity('event_reminders')
export class EventReminder {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ManyToOne(() => CalendarEvent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'event_id' })
  event: CalendarEvent;

  @Column({ name: 'event_id', type: 'int', unsigned: true })
  eventId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'int', unsigned: true })
  userId: number;

  @Column()
  scheduledFor: Date;

  @Column({ default: false })
  sent: boolean;

  @Column({ nullable: true })
  sentAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
