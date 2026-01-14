import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '@modules/users/entities/user.entity';
import { Class } from '@modules/classes/entities/class.entity';
import { LiveSession } from '@modules/live-sessions/entities/live-session.entity';

export enum PollType {
  MULTIPLE_CHOICE = 'multiple_choice',
  SINGLE_CHOICE = 'single_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
}

export enum PollStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  CLOSED = 'closed',
}

@Entity('polls')
export class Poll {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ length: 500 })
  question: string;

  @Column({ type: 'enum', enum: PollType, default: PollType.SINGLE_CHOICE })
  type: PollType;

  @Column({ type: 'enum', enum: PollStatus, default: PollStatus.DRAFT })
  status: PollStatus;

  @Column({ type: 'json', nullable: true })
  options: string[]; // For multiple choice questions

  @Column({ type: 'json', nullable: true })
  correctAnswers: number[]; // Index of correct answers (for quiz mode)

  @Column({ default: false })
  isQuiz: boolean; // If true, has correct answers

  @Column({ default: 0 })
  timeLimit: number; // Seconds, 0 = no limit

  @Column({ default: true })
  showResults: boolean; // Show results to students

  @Column({ default: false })
  anonymous: boolean; // Anonymous voting

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

  @ManyToOne(() => LiveSession, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'session_id' })
  session: LiveSession;

  @Column({ name: 'session_id', type: 'int', unsigned: true, nullable: true })
  sessionId: number;

  @OneToMany(() => PollResponse, (response) => response.poll)
  responses: PollResponse[];

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  closedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('poll_responses')
export class PollResponse {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ManyToOne(() => Poll, (poll) => poll.responses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'poll_id' })
  poll: Poll;

  @Column({ name: 'poll_id', type: 'int', unsigned: true })
  pollId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'int', unsigned: true })
  userId: number;

  @Column({ type: 'json', nullable: true })
  selectedOptions: number[]; // For multiple/single choice

  @Column({ type: 'text', nullable: true })
  textAnswer: string; // For short answer

  @Column({ default: false })
  isCorrect: boolean; // For quiz mode

  @Column({ default: 0 })
  points: number; // Points earned (for quiz)

  @Column()
  answeredAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
