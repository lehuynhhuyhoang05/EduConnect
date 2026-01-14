import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersModule } from '@modules/users/users.module';
import { User } from '@modules/users/entities/user.entity';
import { Notification, PushSubscription } from './entities';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsController } from './notifications.controller';
import { PushNotificationService } from './push-notification.service';
import { PushNotificationController } from './push-notification.controller';

/**
 * Notifications Module
 * Provides real-time notification delivery and management
 * - WebSocket gateway for real-time delivery
 * - REST controller for notification management
 * - Database persistence for notification history
 * - Web Push API for offline notifications
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, PushSubscription, User]),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => UsersModule),
  ],
  controllers: [NotificationsController, PushNotificationController],
  providers: [NotificationsService, NotificationsGateway, PushNotificationService],
  exports: [NotificationsService, NotificationsGateway, PushNotificationService],
})
export class NotificationsModule {}
