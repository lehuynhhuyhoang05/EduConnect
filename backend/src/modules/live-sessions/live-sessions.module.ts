import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { LiveSessionsController } from './live-sessions.controller';
import { LiveSessionsService } from './live-sessions.service';
import { LiveSessionsGateway } from './live-sessions.gateway';
import { LiveSession, LiveSessionParticipant } from './entities';
import { ClassesModule } from '@modules/classes/classes.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LiveSession, LiveSessionParticipant]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
    }),
    ClassesModule,
  ],
  controllers: [LiveSessionsController],
  providers: [LiveSessionsService, LiveSessionsGateway],
  exports: [LiveSessionsService, LiveSessionsGateway],
})
export class LiveSessionsModule {}
