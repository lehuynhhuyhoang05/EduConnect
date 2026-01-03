import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum RoomType {
  CLASS = 'class',
  LIVE_SESSION = 'live_session',
}

export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  IMAGE = 'image',
  SYSTEM = 'system',
}

@Entity('chat_messages')
@Index(['roomId', 'createdAt'])
@Index(['roomType'])
@Index(['senderId'])
export class ChatMessage {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number;

  @Column({ name: 'room_id', length: 100 })
  roomId: string;

  @Column({
    name: 'room_type',
    type: 'enum',
    enum: RoomType,
    default: RoomType.CLASS,
  })
  roomType: RoomType;

  @Column({ name: 'sender_id', type: 'int', unsigned: true })
  senderId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sender_id' })
  sender: User;

  @Column({ type: 'text' })
  message: string;

  @Column({
    name: 'message_type',
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  messageType: MessageType;

  @Column({ name: 'file_url', length: 500, nullable: true })
  fileUrl: string | null;

  @Column({ name: 'reply_to', type: 'bigint', unsigned: true, nullable: true })
  replyTo: number | null;

  @ManyToOne(() => ChatMessage, { nullable: true })
  @JoinColumn({ name: 'reply_to' })
  replyToMessage: ChatMessage | null;

  @Column({ name: 'is_edited', default: false })
  isEdited: boolean;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
