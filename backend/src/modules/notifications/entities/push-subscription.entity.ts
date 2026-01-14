import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '@modules/users/entities/user.entity';

/**
 * Push Subscription Entity
 * Stores Web Push API subscription information for offline notifications
 */
@Entity('push_subscriptions')
export class PushSubscription {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'int', unsigned: true })
  @Index()
  userId: number;

  @Column({ type: 'text' })
  endpoint: string;

  @Column({ type: 'text' })
  p256dh: string; // Public key

  @Column({ type: 'text' })
  auth: string; // Auth secret

  @Column({ length: 100, nullable: true })
  deviceName: string; // Browser/device identifier

  @Column({ length: 100, nullable: true })
  userAgent: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastUsedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
