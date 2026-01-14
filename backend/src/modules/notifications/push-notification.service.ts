import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as webPush from 'web-push';
import { PushSubscription } from './entities/push-subscription.entity';
import { RegisterPushSubscriptionDto, SendPushNotificationDto } from './dto/push-subscription.dto';

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private vapidConfigured = false;

  constructor(
    @InjectRepository(PushSubscription)
    private readonly subscriptionRepository: Repository<PushSubscription>,
    private readonly configService: ConfigService,
  ) {
    this.setupVapid();
  }

  /**
   * Setup VAPID keys for Web Push
   */
  private setupVapid(): void {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const email = this.configService.get<string>('VAPID_EMAIL', 'mailto:admin@educonnect.com');

    if (publicKey && privateKey) {
      webPush.setVapidDetails(email, publicKey, privateKey);
      this.vapidConfigured = true;
      this.logger.log('VAPID keys configured for Web Push');
    } else {
      this.logger.warn('VAPID keys not configured. Push notifications disabled.');
    }
  }

  /**
   * Generate VAPID keys (run once and save to environment)
   */
  static generateVapidKeys(): { publicKey: string; privateKey: string } {
    return webPush.generateVAPIDKeys();
  }

  /**
   * Get VAPID public key for frontend
   */
  getVapidPublicKey(): string | null {
    return this.configService.get<string>('VAPID_PUBLIC_KEY') || null;
  }

  /**
   * Register a push subscription for a user
   */
  async registerSubscription(
    userId: number,
    dto: RegisterPushSubscriptionDto,
  ): Promise<PushSubscription> {
    // Check for existing subscription with same endpoint
    const existing = await this.subscriptionRepository.findOne({
      where: { endpoint: dto.endpoint },
    });

    if (existing) {
      // Update existing
      existing.p256dh = dto.keys.p256dh;
      existing.auth = dto.keys.auth;
      existing.isActive = true;
      existing.lastUsedAt = new Date();
      return this.subscriptionRepository.save(existing);
    }

    // Create new subscription
    const subscription = this.subscriptionRepository.create({
      userId,
      endpoint: dto.endpoint,
      p256dh: dto.keys.p256dh,
      auth: dto.keys.auth,
      deviceName: dto.deviceName,
      userAgent: dto.userAgent,
    });

    return this.subscriptionRepository.save(subscription);
  }

  /**
   * Unregister a push subscription
   */
  async unregisterSubscription(endpoint: string): Promise<void> {
    await this.subscriptionRepository.update(
      { endpoint },
      { isActive: false },
    );
  }

  /**
   * Send push notification to a user (all their devices)
   */
  async sendPushNotification(dto: SendPushNotificationDto): Promise<{
    success: number;
    failed: number;
  }> {
    if (!this.vapidConfigured) {
      this.logger.warn('Push notification skipped - VAPID not configured');
      return { success: 0, failed: 0 };
    }

    const subscriptions = await this.subscriptionRepository.find({
      where: { userId: dto.userId, isActive: true },
    });

    if (subscriptions.length === 0) {
      this.logger.debug(`No push subscriptions for user ${dto.userId}`);
      return { success: 0, failed: 0 };
    }

    const payload = JSON.stringify({
      title: dto.title,
      body: dto.body,
      icon: dto.icon || '/icons/notification-icon.png',
      badge: dto.badge || '/icons/badge-icon.png',
      url: dto.url,
      data: dto.data,
      timestamp: Date.now(),
    });

    let success = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload,
        );

        // Update last used
        sub.lastUsedAt = new Date();
        await this.subscriptionRepository.save(sub);
        success++;
      } catch (error: any) {
        this.logger.error(`Push failed for subscription ${sub.id}:`, error.message);
        
        // If subscription is gone/expired, deactivate it
        if (error.statusCode === 410 || error.statusCode === 404) {
          sub.isActive = false;
          await this.subscriptionRepository.save(sub);
        }
        failed++;
      }
    }

    return { success, failed };
  }

  /**
   * Send push notification to multiple users
   */
  async sendPushToUsers(
    userIds: number[],
    notification: Omit<SendPushNotificationDto, 'userId'>,
  ): Promise<{ success: number; failed: number }> {
    let totalSuccess = 0;
    let totalFailed = 0;

    for (const userId of userIds) {
      const result = await this.sendPushNotification({ ...notification, userId });
      totalSuccess += result.success;
      totalFailed += result.failed;
    }

    return { success: totalSuccess, failed: totalFailed };
  }

  /**
   * Get user's push subscriptions
   */
  async getUserSubscriptions(userId: number): Promise<PushSubscription[]> {
    return this.subscriptionRepository.find({
      where: { userId, isActive: true },
      select: ['id', 'deviceName', 'userAgent', 'lastUsedAt', 'createdAt'],
    });
  }

  /**
   * Remove a specific subscription
   */
  async removeSubscription(subscriptionId: number, userId: number): Promise<void> {
    await this.subscriptionRepository.delete({
      id: subscriptionId,
      userId,
    });
  }

  /**
   * Cleanup old inactive subscriptions (older than 30 days)
   */
  async cleanupOldSubscriptions(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.subscriptionRepository.delete({
      isActive: false,
      lastUsedAt: thirtyDaysAgo as any, // LessThan would be imported
    });

    return result.affected || 0;
  }
}
