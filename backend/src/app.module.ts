import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { typeOrmConfig } from './config/typeorm.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Common modules
import { LoggerModule } from './common/logger/logger.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClassesModule } from './modules/classes/classes.module';
import { FilesModule } from './modules/files/files.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { LiveSessionsModule } from './modules/live-sessions/live-sessions.module';
import { ChatModule } from './modules/chat/chat.module';
import { WhiteboardModule } from './modules/whiteboard/whiteboard.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Rate limiting - prevent DDoS and brute force attacks
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,  // 1 second
        limit: 10,  // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 10000, // 10 seconds
        limit: 50,  // 50 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 200, // 200 requests per minute
      },
    ]),
    TypeOrmModule.forRootAsync({
      useFactory: typeOrmConfig,
    }),
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
