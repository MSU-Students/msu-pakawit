import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as webpush from 'web-push';
import { Repository } from 'typeorm';
import { NotificationPreferenceEntity } from './notification-preference.entity';
import { PushSubscriptionEntity } from './push-subscription.entity';
import { SubscribeDto, UpdatePreferencesDto } from './dto/notification.dto';

export type PushEventType = 'ASSIGNMENT' | 'STATUS_CHANGE';

/** Payload delivered to the service worker (acceptance criterion: id + status). */
export interface PushPayload {
  type: PushEventType;
  errandId: string;
  orderId?: string;
  status: string;
  title: string;
  body: string;
  /** In-app route opened when the notification is clicked. */
  url: string;
}

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private vapidConfigured = false;

  constructor(
    @InjectRepository(PushSubscriptionEntity)
    private readonly subscriptions: Repository<PushSubscriptionEntity>,
    @InjectRepository(NotificationPreferenceEntity)
    private readonly preferences: Repository<NotificationPreferenceEntity>,
  ) {}

  onModuleInit(): void {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT ?? 'mailto:admin@msu-pakawit.local';

    if (!publicKey || !privateKey) {
      this.logger.warn(
        'VAPID keys are not set. Push notifications are disabled until VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are configured.',
      );
      return;
    }
    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.vapidConfigured = true;
  }

  getPublicKey(): string {
    return process.env.VAPID_PUBLIC_KEY ?? '';
  }

  // ---------------------------------------------------------------- subscriptions

  async saveSubscription(userId: string, dto: SubscribeDto): Promise<void> {
    // endpoint is unique: re-subscribing the same browser just re-assigns ownership.
    await this.subscriptions.upsert(
      {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
      },
      ['endpoint'],
    );
  }

  async removeSubscription(userId: string, endpoint: string): Promise<void> {
    await this.subscriptions.delete({ userId, endpoint });
  }

  // ---------------------------------------------------------------- preferences

  async getPreferences(userId: string): Promise<NotificationPreferenceEntity> {
    const existing = await this.preferences.findOne({ where: { userId } });
    if (existing) return existing;
    return this.preferences.save(this.preferences.create({ userId }));
  }

  async updatePreferences(
    userId: string,
    dto: UpdatePreferencesDto,
  ): Promise<NotificationPreferenceEntity> {
    const current = await this.getPreferences(userId);
    const merged = this.preferences.merge(current, dto);
    return this.preferences.save(merged);
  }

  // ---------------------------------------------------------------- sending

  /** Call when an errand/order changes status. */
  notifyStatusChange(
    userId: string,
    errandId: string,
    status: string,
    orderId?: string,
  ): Promise<void> {
    return this.send(userId, {
      type: 'STATUS_CHANGE',
      errandId,
      orderId,
      status,
      title: 'Errand status updated',
      body: `Errand #${shortId(errandId)} is now ${humanize(status)}.`,
      url: `/errands/${errandId}`,
    });
  }

  /** Call when a runner is assigned to / claims an errand. */
  notifyAssignment(
    userId: string,
    errandId: string,
    status: string,
    orderId?: string,
  ): Promise<void> {
    return this.send(userId, {
      type: 'ASSIGNMENT',
      errandId,
      orderId,
      status,
      title: 'New errand assignment',
      body: `Errand #${shortId(errandId)} has been assigned (${humanize(status)}).`,
      url: `/errands/${errandId}`,
    });
  }

  /**
   * Sends a payload to all of a user's devices, honouring their preferences.
   * Never throws: a failed push must not roll back an errand state transition.
   */
  async send(userId: string, payload: PushPayload): Promise<void> {
    try {
      if (!this.vapidConfigured) return;

      const prefs = await this.getPreferences(userId);
      if (!prefs.pushEnabled) return;
      if (payload.type === 'ASSIGNMENT' && !prefs.assignments) return;
      if (payload.type === 'STATUS_CHANGE' && !prefs.statusChanges) return;

      const subs = await this.subscriptions.find({ where: { userId } });
      const body = JSON.stringify(payload);

      await Promise.all(
        subs.map(async (sub) => {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              body,
            );
          } catch (error) {
            const statusCode = (error as { statusCode?: number }).statusCode;
            if (statusCode === 404 || statusCode === 410) {
              // Subscription expired or was revoked by the browser: clean it up.
              await this.subscriptions.delete({ id: sub.id });
            } else {
              this.logger.warn(`Push delivery failed (${statusCode ?? 'unknown'}) for user ${userId}`);
            }
          }
        }),
      );
    } catch (error) {
      this.logger.error('Unexpected error while sending push notification', error as Error);
    }
  }
}

function shortId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) : id;
}

function humanize(status: string): string {
  return status.toLowerCase().replace(/_/g, ' ');
}