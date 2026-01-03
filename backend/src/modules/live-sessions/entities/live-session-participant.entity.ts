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
import { LiveSession } from './live-session.entity';

export enum ConnectionQuality {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  POOR = 'poor',
  UNKNOWN = 'unknown',
}

@Entity('live_sessions_participants')
@Unique(['liveSessionId', 'userId'])
export class LiveSessionParticipant {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ name: 'live_session_id', type: 'int', unsigned: true })
  liveSessionId: number;

  @Column({ name: 'user_id', type: 'int', unsigned: true })
  userId: number;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @Column({ name: 'left_at', type: 'timestamp', nullable: true })
  leftAt: Date;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({
    name: 'connection_quality',
    type: 'enum',
    enum: ConnectionQuality,
    default: ConnectionQuality.UNKNOWN,
  })
  connectionQuality: ConnectionQuality;

  // Relations
  @ManyToOne(() => LiveSession, (session) => session.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'live_session_id' })
  liveSession: LiveSession;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
