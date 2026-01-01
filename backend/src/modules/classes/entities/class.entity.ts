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
import { ClassMember } from './class-member.entity';

@Entity('classes')
@Index('idx_class_code', ['classCode'], { unique: true })
@Index('idx_class_teacher', ['teacherId'])
@Index('idx_class_active', ['isActive'])
export class Class {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'class_code', type: 'varchar', length: 6, unique: true })
  classCode: string;

  @Column({ name: 'teacher_id', type: 'int', unsigned: true })
  teacherId: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  subject: string | null;

  @Column({ name: 'member_count', type: 'int', default: 0 })
  memberCount: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: User;

  @OneToMany(() => ClassMember, (member) => member.class)
  members: ClassMember[];
}
