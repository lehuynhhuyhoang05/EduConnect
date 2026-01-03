import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '@modules/users/entities/user.entity';
import { Class } from '@modules/classes/entities';
import { LiveSessionParticipant } from './live-session-participant.entity';

export enum LiveSessionStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  ENDED = 'ended',
}

@Entity('live_sessions')
@Index(['status'])
@Index(['scheduledAt'])
export class LiveSession {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ name: 'class_id', type: 'int', unsigned: true })
  classId: number;

  @Column({ name: 'room_id', type: 'char', length: 36, unique: true })
  roomId: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'host_id', type: 'int', unsigned: true })
  hostId: number;

  @Column({
    type: 'enum',
    enum: LiveSessionStatus,
    default: LiveSessionStatus.SCHEDULED,
  })
  status: LiveSessionStatus;

  @Column({ name: 'scheduled_at', type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt: Date;

  @Column({ name: 'max_participants', type: 'smallint', unsigned: true, default: 20 })
  maxParticipants: number;

  @Column({ name: 'current_participants', type: 'smallint', unsigned: true, default: 0 })
  currentParticipants: number;

  @Column({ name: 'recording_url', type: 'varchar', length: 500, nullable: true })
  recordingUrl: string;

  @Column({ name: 'duration_seconds', type: 'int', unsigned: true, nullable: true })
  durationSeconds: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Class, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'host_id' })
  host: User;

  @OneToMany(() => LiveSessionParticipant, (p) => p.liveSession)
  participants: LiveSessionParticipant[];
}
