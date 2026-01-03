import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ClassesModule } from '@modules/classes/classes.module';
import { LiveSessionsModule } from '@modules/live-sessions/live-sessions.module';
import { UsersModule } from '@modules/users/users.module';
import { User } from '@modules/users/entities/user.entity';
import { WhiteboardStroke } from './entities';
import { WhiteboardService } from './whiteboard.service';
import { WhiteboardGateway } from './whiteboard.gateway';
import { WhiteboardController } from './whiteboard.controller';

/**
 * Whiteboard Module
 * Provides real-time collaborative drawing functionality
 * - WebSocket gateway for real-time synchronization
 * - REST controller for state queries
 * - In-memory buffering for active strokes
 * - Database persistence for completed strokes
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([WhiteboardStroke, User]),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => ClassesModule),
    forwardRef(() => LiveSessionsModule),
    forwardRef(() => UsersModule),
  ],
  controllers: [WhiteboardController],
  providers: [WhiteboardService, WhiteboardGateway],
  exports: [WhiteboardService],
})
export class WhiteboardModule {}
