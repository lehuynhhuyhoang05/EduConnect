import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '@modules/users/entities/user.entity';
import { Class } from '@modules/classes/entities/class.entity';

export enum ActivityType {
  LOGIN = 'login',
  VIEW_MATERIAL = 'view_material',
  DOWNLOAD_MATERIAL = 'download_material',
  SUBMIT_ASSIGNMENT = 'submit_assignment',
  ATTEND_LIVE_SESSION = 'attend_live_session',
  COMPLETE_QUIZ = 'complete_quiz',
  POST_CHAT = 'post_chat',
  VIEW_VIDEO = 'view_video',
}

/**
 * Learning Activity - Tracks individual learning activities
 */
@Entity('learning_activities')
export class LearningActivity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'int', unsigned: true })
  userId: number;

  @ManyToOne(() => Class, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @Column({ name: 'class_id', type: 'int', unsigned: true, nullable: true })
  classId: number;

  @Column({ type: 'enum', enum: ActivityType })
  activityType: ActivityType;

  @Column({ type: 'int', unsigned: true, nullable: true })
  resourceId: number; // ID of material, assignment, session, etc.

  @Column({ length: 200, nullable: true })
  resourceTitle: string;

  @Column({ type: 'int', default: 0 })
  duration: number; // Duration in seconds (for video watching, session attendance)

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>; // Additional data (score, progress percentage, etc.)

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

/**
 * Student Progress Summary - Aggregated progress per class
 */
@Entity('student_progress')
@Unique(['userId', 'classId'])
export class StudentProgress {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'int', unsigned: true })
  userId: number;

  @ManyToOne(() => Class, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @Column({ name: 'class_id', type: 'int', unsigned: true })
  classId: number;

  // Materials Progress
  @Column({ type: 'int', default: 0 })
  totalMaterials: number;

  @Column({ type: 'int', default: 0 })
  viewedMaterials: number;

  // Assignments Progress
  @Column({ type: 'int', default: 0 })
  totalAssignments: number;

  @Column({ type: 'int', default: 0 })
  submittedAssignments: number;

  @Column({ type: 'int', default: 0 })
  gradedAssignments: number;

  // Live Sessions Progress
  @Column({ type: 'int', default: 0 })
  totalSessions: number;

  @Column({ type: 'int', default: 0 })
  attendedSessions: number;

  @Column({ type: 'int', default: 0 })
  totalSessionTime: number; // Total time in seconds

  // Quiz Progress
  @Column({ type: 'int', default: 0 })
  totalQuizzes: number;

  @Column({ type: 'int', default: 0 })
  completedQuizzes: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  averageQuizScore: number;

  // Engagement Metrics
  @Column({ type: 'int', default: 0 })
  totalLogins: number;

  @Column({ nullable: true })
  lastActivityAt: Date;

  @Column({ type: 'int', default: 0 })
  streakDays: number; // Consecutive days active

  @Column({ nullable: true })
  longestStreak: number;

  // Overall Progress
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  overallProgress: number; // 0-100 percentage

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/**
 * Daily Activity Summary - For charts and analytics
 */
@Entity('daily_activity_summary')
@Unique(['userId', 'classId', 'date'])
export class DailyActivitySummary {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ name: 'user_id', type: 'int', unsigned: true })
  userId: number;

  @Column({ name: 'class_id', type: 'int', unsigned: true, nullable: true })
  classId: number;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'int', default: 0 })
  activitiesCount: number;

  @Column({ type: 'int', default: 0 })
  timeSpent: number; // Total time in seconds

  @Column({ type: 'int', default: 0 })
  materialsViewed: number;

  @Column({ type: 'int', default: 0 })
  assignmentsSubmitted: number;

  @Column({ type: 'int', default: 0 })
  sessionsAttended: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
