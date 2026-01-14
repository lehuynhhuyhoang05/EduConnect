import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@modules/auth/decorators';
import { User } from '@modules/users/entities/user.entity';
import { PushNotificationService } from './push-notification.service';
import { RegisterPushSubscriptionDto } from './dto/push-subscription.dto';

@ApiTags('Push Notifications')
@Controller('push-notifications')
export class PushNotificationController {
  constructor(private readonly pushService: PushNotificationService) {}

  @Get('vapid-key')
  @ApiOperation({ summary: 'Get VAPID public key for push subscription' })
  getVapidKey() {
    const key = this.pushService.getVapidPublicKey();
    return { vapidPublicKey: key };
  }

  @Post('subscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register push subscription' })
  async subscribe(
    @Body() dto: RegisterPushSubscriptionDto,
    @CurrentUser() user: User,
  ) {
    const subscription = await this.pushService.registerSubscription(user.id, dto);
    return { success: true, subscriptionId: subscription.id };
  }

  @Post('unsubscribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unregister push subscription' })
  async unsubscribe(@Body() body: { endpoint: string }) {
    await this.pushService.unregisterSubscription(body.endpoint);
    return { success: true };
  }

  @Get('subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user push subscriptions' })
  async getSubscriptions(@CurrentUser() user: User) {
    const subscriptions = await this.pushService.getUserSubscriptions(user.id);
    return { subscriptions };
  }

  @Delete('subscriptions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a specific subscription' })
  async removeSubscription(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    await this.pushService.removeSubscription(id, user.id);
    return { success: true };
  }
}
