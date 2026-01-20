import { Assignment } from '@modules/assignments/entities/assignment.entity';
import { Submission } from '@modules/assignments/entities/submission.entity';
import { RefreshToken } from '@modules/auth/entities/refresh-token.entity';
import { ChatMessage } from '@modules/chat/entities/chat-message.entity';
import { Class, ClassMember } from '@modules/classes/entities';
import { File } from '@modules/files/entities';
import { LiveSession, LiveSessionParticipant } from '@modules/live-sessions/entities';
import { Notification, PushSubscription } from '@modules/notifications/entities';
import { User } from '@modules/users/entities/user.entity';
import { WhiteboardStroke } from '@modules/whiteboard/entities';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
// New feature entities
import { CalendarEvent, EventReminder } from '@modules/calendar/entities';
import { GradeEntry, GradeItem } from '@modules/gradebook/entities';
import { Material } from '@modules/materials/entities';
import { Poll, PollResponse } from '@modules/polls/entities';
import {
  DailyActivitySummary,
  LearningActivity,
  StudentProgress,
} from '@modules/progress/entities';

dotenv.config();

// Explicitly list entities to avoid path issues with non-ASCII characters
const entities = [
  User,
  RefreshToken,
  Class,
  ClassMember,
  File,
  Assignment,
  Submission,
  LiveSession,
  LiveSessionParticipant,
  ChatMessage,
  WhiteboardStroke,
  Notification,
  // New feature entities
  PushSubscription,
  Poll,
  PollResponse,
  GradeItem,
  GradeEntry,
  LearningActivity,
  StudentProgress,
  DailyActivitySummary,
  CalendarEvent,
  EventReminder,
  Material,
];

export const typeOrmConfig = (): TypeOrmModuleOptions => ({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  username: process.env.DB_USERNAME || 'educonnect_user',
  password: process.env.DB_PASSWORD || 'educonnect_password',
  database: process.env.DB_DATABASE || 'educonnect_db',
  entities: entities,
  synchronize: true, // DEVELOPMENT ONLY - creates tables from entities
  logging: process.env.NODE_ENV === 'development',
  charset: 'utf8mb4',
  timezone: '+07:00', // Vietnam timezone
});

// For migrations CLI
const dataSourceOptions: DataSourceOptions = {
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  username: process.env.DB_USERNAME || 'educonnect_user',
  password: process.env.DB_PASSWORD || 'educonnect_password',
  database: process.env.DB_DATABASE || 'educonnect_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: false,
  charset: 'utf8mb4',
  timezone: '+07:00',
};

export const AppDataSource = new DataSource(dataSourceOptions);
