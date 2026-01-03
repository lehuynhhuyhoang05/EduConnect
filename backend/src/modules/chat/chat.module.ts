import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ClassesModule } from '../classes/classes.module';
import { LiveSessionsModule } from '../live-sessions/live-sessions.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'educonnect-dev-secret-2025-change-in-production',
      signOptions: { expiresIn: '7d' },
    }),
    ClassesModule,
    forwardRef(() => LiveSessionsModule),
    UsersModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
