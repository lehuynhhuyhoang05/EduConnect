import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { LiveSessionsController } from './live-sessions.controller';
import { LiveSessionsService } from './live-sessions.service';
import { LiveSessionsGateway } from './live-sessions.gateway';
import { NetworkDiagnosticsService } from './network-diagnostics.service';
import { BreakoutRoomsService } from './breakout-rooms.service';
import { RealTimePollsService } from './realtime-polls.service';
import { SessionAnalyticsService } from './session-analytics.service';
import { RecordingService } from './recording.service';
import { ConnectionQualityService } from './connection-quality.service';
import { SmartReconnectionService } from './smart-reconnection.service';
import { AttendanceTrackingService } from './attendance-tracking.service';
import { HandRaiseService } from './hand-raise.service';
import { WaitingRoomService } from './waiting-room.service';
import { QAService } from './qa.service';
import { VirtualBackgroundService } from './virtual-background.service';
import { ScreenAnnotationService } from './screen-annotation.service';
import { LiveSession, LiveSessionParticipant } from './entities';
import { ClassesModule } from '@modules/classes/classes.module';
import { User } from '@modules/users/entities/user.entity';
import { LoggerModule } from '@common/logger/logger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LiveSession, LiveSessionParticipant, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
    }),
    ClassesModule,
    LoggerModule,
  ],
  controllers: [LiveSessionsController],
  providers: [
    LiveSessionsService, 
    LiveSessionsGateway, 
    NetworkDiagnosticsService,
    BreakoutRoomsService,
    RealTimePollsService,
    SessionAnalyticsService,
    RecordingService,
    ConnectionQualityService,
    SmartReconnectionService,
    AttendanceTrackingService,
    HandRaiseService,
    WaitingRoomService,
    QAService,
    VirtualBackgroundService,
    ScreenAnnotationService,
  ],
  exports: [
    LiveSessionsService, 
    LiveSessionsGateway, 
    NetworkDiagnosticsService,
    BreakoutRoomsService,
    RealTimePollsService,
    SessionAnalyticsService,
    RecordingService,
    ConnectionQualityService,
    SmartReconnectionService,
    AttendanceTrackingService,
    HandRaiseService,
    WaitingRoomService,
    QAService,
    VirtualBackgroundService,
    ScreenAnnotationService,
  ],
})
export class LiveSessionsModule {}
