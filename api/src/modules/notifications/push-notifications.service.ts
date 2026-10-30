import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as webPush from 'web-push';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ErrandOrder } from '../dispatch/entities/errand-order.entity';
import { PushSubscription } from './entities/push-subscription.entity';
import { PushSubscriptionDto } from './dto/push-subscription.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

type ErrandNotification = {
  title: string;
  body: string;
  data: { type: 'status' | 'assignment'; errandId: string; status: string; url: string };
};

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);
  private readonly vapidPublicKey: string;
  private readonly isConfigured: boolean;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(PushSubscription) private readonly subscriptionRepo: Repository<PushSubscription>,
  ) {
    this.vapidPublicKey = this.config.get<string>('VAPID_PUBLIC_KEY') ?? '';
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY') ?? '';
    const subject = this.config.get<string>('VAPID_SUBJECT') ?? '';
    this.isConfigured = Boolean(this.vapidPublicKey && privateKey && subject);
    if (this.isConfigured) {
      webPush.setVapidDetails(subject, this.vapidPublicKey, privateKey);
    }
  }

  getPublicKey(): string {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException('Web Push is not configured on this server');
    }
    return this.vapidPublicKey;
  }

  async getPreferences(userId: string) {
    const user = await this.userRepo.findOneByOrFail({ id: userId });
    return {
      statusChanges: user.notifyOnErrandStatusChanges,
      assignments: user.notifyOnErrandAssignments,
    };
  }

  async updatePreferences(userId: string, preferences: UpdateNotificationPreferencesDto) {
    const user = await this.userRepo.findOneByOrFail({ id: userId });
    if (preferences.statusChanges !== undefined) {
      user.notifyOnErrandStatusChanges = preferences.statusChanges;
    }
    if (preferences.assignments !== undefined) {
      user.notifyOnErrandAssignments = preferences.assignments;
    }
    await this.userRepo.save(user);
    return this.getPreferences(userId);
  }

  async saveSubscription(userId: string, dto: PushSubscriptionDto): Promise<void> {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException('Web Push is not configured on this server');
    }
    const existing = await this.subscriptionRepo.findOneBy({ endpoint: dto.endpoint });
    await this.subscriptionRepo.save(this.subscriptionRepo.create({
      ...(existing ?? {}),
      userId,
      endpoint: dto.endpoint,
      keys: dto.keys,
      expirationTime: dto.expirationTime ? new Date(dto.expirationTime) : null,
    }));
  }

  async removeSubscription(userId: string, endpoint: string): Promise<void> {
    await this.subscriptionRepo.delete({ userId, endpoint });
  }

  async notifyErrandStatusChanged(errand: ErrandOrder): Promise<void> {
    await this.deliver(errand, () => this.notifyUser(errand.buyerStudentId, 'statusChanges', {
      title: `Errand #${errand.id} updated`,
      body: `The errand status is now ${errand.status}.`,
      data: this.notificationData(errand, 'status'),
    }));
  }

  async notifyErrandAssigned(errand: ErrandOrder): Promise<void> {
    if (!errand.runnerStudentId) return;
    await this.deliver(errand, () => this.notifyUser(errand.runnerStudentId, 'assignments', {
      title: `Errand #${errand.id} assigned`,
      body: `You have been assigned this errand. Status: ${errand.status}.`,
      data: this.notificationData(errand, 'assignment'),
    }));
  }

  private async deliver(errand: ErrandOrder, send: () => Promise<void>): Promise<void> {
    try {
      await send();
    } catch (error) {
      this.logger.error(
        `Could not deliver notifications for errand ${errand.id} (${errand.status})`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private notificationData(errand: ErrandOrder, type: 'status' | 'assignment') {
    return {
      type,
      errandId: errand.id,
      status: errand.status,
      url: `/errands/${encodeURIComponent(errand.id)}`,
    };
  }

  private async notifyUser(
    msuIdNumber: string,
    preference: 'statusChanges' | 'assignments',
    payload: ErrandNotification,
  ): Promise<void> {
    if (!this.isConfigured) {
      this.logger.warn(`Push notification skipped for errand ${payload.data.errandId}: VAPID is not configured`);
      return;
    }
    const user = await this.userRepo.findOneBy({ msuIdNumber });
    if (!user) {
      this.logger.warn(`Push notification recipient ${msuIdNumber} was not found`);
      return;
    }
    const enabled = preference === 'statusChanges'
      ? user.notifyOnErrandStatusChanges
      : user.notifyOnErrandAssignments;
    if (!enabled) return;

    const subscriptions = await this.subscriptionRepo.findBy({ userId: user.id });
    await Promise.all(subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification({
          endpoint: subscription.endpoint,
          keys: subscription.keys,
        }, JSON.stringify(payload));
      } catch (error) {
        const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
          ? Number(error.statusCode)
          : undefined;
        if (statusCode === 404 || statusCode === 410) {
          try {
            await this.subscriptionRepo.delete({ id: subscription.id });
          } catch (cleanupError) {
            this.logger.error(
              `Could not remove expired push subscription ${subscription.id}`,
              cleanupError instanceof Error ? cleanupError.stack : undefined,
            );
          }
          return;
        }
        this.logger.error(
          `Push delivery failed for errand ${payload.data.errandId} (HTTP ${statusCode ?? 'unknown'})`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }));
  }
}
