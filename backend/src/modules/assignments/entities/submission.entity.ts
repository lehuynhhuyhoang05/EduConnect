import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '@modules/users/entities/user.entity';
import { Assignment } from './assignment.entity';

export enum SubmissionStatus {
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  RETURNED = 'returned',
}

@Entity('submissions')
@Unique(['assignmentId', 'studentId'])
export class Submission {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ name: 'assignment_id', type: 'int', unsigned: true })
  assignmentId: number;

  @Column({ name: 'student_id', type: 'int', unsigned: true })
  studentId: number;

  @Column({ name: 'file_url', type: 'varchar', length: 500, nullable: true })
  fileUrl: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({
    type: 'enum',
    enum: SubmissionStatus,
    default: SubmissionStatus.SUBMITTED,
  })
  status: SubmissionStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score: number;

  @Column({ type: 'text', nullable: true })
  feedback: string;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;

  @Column({ name: 'graded_at', type: 'timestamp', nullable: true })
  gradedAt: Date;

  @Column({ name: 'graded_by', type: 'int', unsigned: true, nullable: true })
  gradedBy: number;

  // Relations
  @ManyToOne(() => Assignment, (assignment) => assignment.submissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignment_id' })
  assignment: Assignment;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'graded_by' })
  grader: User;
}
