import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmConfig } from './config/typeorm.config';

// Common modules
import { LoggerModule } from './common/logger/logger.module';

// Feature modules
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { ClassesModule } from './modules/classes/classes.module';
import { FilesModule } from './modules/files/files.module';
import { LiveSessionsModule } from './modules/live-sessions/live-sessions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UsersModule } from './modules/users/users.module';
import { WhiteboardModule } from './modules/whiteboard/whiteboard.module';

// New Feature modules
import { AdminModule } from './modules/admin/admin.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { GradebookModule } from './modules/gradebook/gradebook.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { PollsModule } from './modules/polls/polls.module';
import { ProgressModule } from './modules/progress/progress.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Rate limiting - prevent DDoS and brute force attacks
    // Relaxed limits for development
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 second
        limit: 30, // 30 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 150, // 150 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 500, // 500 requests per minute
      },
    ]),
    TypeOrmModule.forRootAsync({
      useFactory: typeOrmConfig,
    }),
    ScheduleModule.forRoot(),
    LoggerModule,
    AuthModule,
    UsersModule,
    ClassesModule,
    FilesModule,
    AssignmentsModule,
    LiveSessionsModule,
    ChatModule,
    WhiteboardModule,
    NotificationsModule,
    // New Feature modules
    PollsModule,
    GradebookModule,
    ProgressModule,
    CalendarModule,
    AdminModule,
    MaterialsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
