import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '@modules/users/entities/user.entity';

@Entity('files')
export class File {
  @PrimaryGeneratedColumn({ unsigned: true })
  id: number;

  @Column({ name: 'original_name', length: 255 })
  originalName: string;

  @Column({ name: 'stored_name', length: 255 })
  storedName: string;

  @Column({ length: 500 })
  path: string;

  @Column({ name: 'mime_type', length: 100 })
  mimeType: string;

  @Column({ type: 'bigint', unsigned: true })
  size: number;

  @Index('idx_file_uploader')
  @Column({ name: 'uploaded_by', unsigned: true })
  uploadedBy: number;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User;
}
