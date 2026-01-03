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

/**
 * Tool types for whiteboard drawing
 */
export enum DrawingTool {
  PEN = 'pen',
  HIGHLIGHTER = 'highlighter',
  ERASER = 'eraser',
  LINE = 'line',
  RECTANGLE = 'rectangle',
  ELLIPSE = 'ellipse',
  TEXT = 'text',
  ARROW = 'arrow',
}

/**
 * Represents a single drawing point
 */
export interface DrawingPoint {
  x: number;
  y: number;
  pressure?: number; // For pressure-sensitive stylus
}

/**
 * WhiteboardStroke Entity
 * Stores individual strokes/drawings on the whiteboard
 * Each stroke belongs to a room (class or live session)
 */
@Entity('whiteboard_strokes')
@Index(['roomId', 'roomType'])
export class WhiteboardStroke {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id: number;

  // Room identification
  @Column({ name: 'room_id', type: 'varchar', length: 100 })
  roomId: string;

  @Column({ name: 'room_type', type: 'varchar', length: 20 })
  roomType: string; // 'class' | 'live-session'

  // User who drew this stroke
  @Column({ name: 'user_id', type: 'int', unsigned: true })
  userId: number;

  // Stroke identifier for undo/redo
  @Column({ name: 'stroke_id', type: 'varchar', length: 50 })
  strokeId: string;

  // Drawing tool used
  @Column({
    name: 'tool',
    type: 'enum',
    enum: DrawingTool,
    default: DrawingTool.PEN,
  })
  tool: DrawingTool;

  // Path data - stored as JSON array of points
  @Column({ name: 'path', type: 'json' })
  path: DrawingPoint[];

  // Stroke style properties
  @Column({ name: 'color', type: 'varchar', length: 20, default: '#000000' })
  color: string;

  @Column({ name: 'stroke_width', type: 'float', default: 2 })
  strokeWidth: number;

  @Column({ name: 'opacity', type: 'float', default: 1 })
  opacity: number;

  // For text tool
  @Column({ name: 'text_content', type: 'text', nullable: true })
  textContent: string;

  @Column({ name: 'font_size', type: 'int', nullable: true })
  fontSize: number;

  @Column({ name: 'font_family', type: 'varchar', length: 100, nullable: true })
  fontFamily: string;

  // Bounding box for shape tools
  @Column({ name: 'start_x', type: 'float', nullable: true })
  startX: number;

  @Column({ name: 'start_y', type: 'float', nullable: true })
  startY: number;

  @Column({ name: 'end_x', type: 'float', nullable: true })
  endX: number;

  @Column({ name: 'end_y', type: 'float', nullable: true })
  endY: number;

  // Deleted flag for undo/clear
  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
