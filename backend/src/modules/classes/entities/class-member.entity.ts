import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '@modules/users/entities/user.entity';
import { Class } from './class.entity';

export enum ClassRole {
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
}

@Entity('class_members')
@Unique('unique_class_user', ['classId', 'userId'])
@Index('idx_member_class', ['classId'])
@Index('idx_member_user', ['userId'])
export class ClassMember {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  @Column({ name: 'class_id', type: 'int', unsigned: true })
  classId: number;

  @Column({ name: 'user_id', type: 'int', unsigned: true })
  userId: number;

  @Column({
    type: 'enum',
    enum: ClassRole,
    default: ClassRole.STUDENT,
  })
  role: ClassRole;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  // Relations
  @ManyToOne(() => Class, (cls) => cls.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
