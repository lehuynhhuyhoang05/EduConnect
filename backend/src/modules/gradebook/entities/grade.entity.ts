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

export enum GradeCategory {
  ASSIGNMENT = 'assignment',
  QUIZ = 'quiz',
  EXAM = 'exam',
  ATTENDANCE = 'attendance',
  PARTICIPATION = 'participation',
  PROJECT = 'project',
  OTHER = 'other',
}

/**
 * Grade Item - Định nghĩa một cột điểm trong bảng điểm
 */
@Entity('grade_items')
export class GradeItem {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: GradeCategory, default: GradeCategory.OTHER })
  category: GradeCategory;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 100 })
  maxScore: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1 })
  weight: number; // Weight in final grade calculation

  @ManyToOne(() => Class, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @Column({ name: 'class_id', type: 'int', unsigned: true })
  classId: number;

  @Column({ nullable: true })
  dueDate: Date;

  @Column({ default: true })
  isPublished: boolean;

  @Column({ type: 'int', unsigned: true, nullable: true })
  relatedAssignmentId: number; // Link to Assignment if applicable

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/**
 * Grade Entry - Điểm của từng học sinh cho từng grade item
 */
@Entity('grade_entries')
@Unique(['gradeItemId', 'studentId'])
export class GradeEntry {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ManyToOne(() => GradeItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'grade_item_id' })
  gradeItem: GradeItem;

  @Column({ name: 'grade_item_id', type: 'int', unsigned: true })
  gradeItemId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'student_id', type: 'int', unsigned: true })
  studentId: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score: number;

  @Column({ type: 'text', nullable: true })
  feedback: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'graded_by' })
  gradedBy: User;

  @Column({ name: 'graded_by', type: 'int', unsigned: true, nullable: true })
  gradedById: number;

  @Column({ nullable: true })
  gradedAt: Date;

  @Column({ default: false })
  isExcused: boolean; // Excluded from calculation

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
