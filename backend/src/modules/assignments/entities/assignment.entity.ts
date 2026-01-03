import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '@modules/users/entities/user.entity';
import { Class } from '@modules/classes/entities';
import { Submission } from './submission.entity';

@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ name: 'class_id', type: 'int', unsigned: true })
  classId: number;

  @Column({ name: 'created_by', type: 'int', unsigned: true })
  createdBy: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp', nullable: true })
  deadline: Date;

  @Column({ name: 'max_score', type: 'decimal', precision: 5, scale: 2, unsigned: true, default: 100 })
  maxScore: number;

  @Column({ name: 'attachment_url', type: 'varchar', length: 500, nullable: true })
  attachmentUrl: string;

  @Column({ name: 'submission_count', type: 'int', unsigned: true, default: 0 })
  submissionCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Class, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => Submission, (submission) => submission.assignment)
  submissions: Submission[];
}
