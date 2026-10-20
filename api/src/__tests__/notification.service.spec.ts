import * as webpush from 'web-push';
import { NotificationService } from '../modules/dispatch/notifications/notification.service';

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

type Prefs = { userId: string; pushEnabled: boolean; statusChanges: boolean; assignments: boolean };

function build(prefs: Partial<Prefs> = {}, subs: Array<Record<string, string>> = []) {
  const prefRow: Prefs = {
    userId: 'u1',
    pushEnabled: true,
    statusChanges: true,
    assignments: true,
    ...prefs,
  };
  const subscriptions = {
    upsert: jest.fn(),
    delete: jest.fn(),
    find: jest.fn().mockResolvedValue(subs),
  };
  const preferences = {
    findOne: jest.fn().mockResolvedValue(prefRow),
    create: jest.fn((v: unknown) => v),
    save: jest.fn(async (v: unknown) => v),
    merge: jest.fn((a: object, b: object) => ({ ...a, ...b })),
  };
  const service = new NotificationService(subscriptions as never, preferences as never);
  service.onModuleInit();
  return { service, subscriptions, preferences };
}

const sub = { id: 's1', endpoint: 'https://push.example/1', p256dh: 'k', auth: 'a' };

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.VAPID_PUBLIC_KEY = 'pub';
    process.env.VAPID_PRIVATE_KEY = 'priv';
  });

  it('sends a payload containing the errand id and status', async () => {
    const { service } = build({}, [sub]);
    await service.notifyStatusChange('u1', 'errand-12345678', 'PICKED_UP', 'order-1');

    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    const body = JSON.parse((webpush.sendNotification as jest.Mock).mock.calls[0][1]);
    expect(body).toMatchObject({
      type: 'STATUS_CHANGE',
      errandId: 'errand-12345678',
      orderId: 'order-1',
      status: 'PICKED_UP',
      url: '/errands/errand-12345678',
    });
  });

  it('sends assignment notifications', async () => {
    const { service } = build({}, [sub]);
    await service.notifyAssignment('u1', 'e1', 'ACCEPTED');
    const body = JSON.parse((webpush.sendNotification as jest.Mock).mock.calls[0][1]);
    expect(body.type).toBe('ASSIGNMENT');
  });

  it('skips sending when push is disabled', async () => {
    const { service } = build({ pushEnabled: false }, [sub]);
    await service.notifyStatusChange('u1', 'e1', 'COMPLETED');
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it('respects per-event preferences', async () => {
    const { service } = build({ statusChanges: false }, [sub]);
    await service.notifyStatusChange('u1', 'e1', 'COMPLETED');
    expect(webpush.sendNotification).not.toHaveBeenCalled();

    await service.notifyAssignment('u1', 'e1', 'ACCEPTED');
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
  });

  it('deletes expired subscriptions (410)', async () => {
    (webpush.sendNotification as jest.Mock).mockRejectedValueOnce({ statusCode: 410 });
    const { service, subscriptions } = build({}, [sub]);
    await service.notifyStatusChange('u1', 'e1', 'COMPLETED');
    expect(subscriptions.delete).toHaveBeenCalledWith({ id: 's1' });
  });

  it('never throws when delivery fails for other reasons', async () => {
    (webpush.sendNotification as jest.Mock).mockRejectedValueOnce({ statusCode: 500 });
    const { service, subscriptions } = build({}, [sub]);
    await expect(service.notifyStatusChange('u1', 'e1', 'COMPLETED')).resolves.toBeUndefined();
    expect(subscriptions.delete).not.toHaveBeenCalled();
  });

  it('upserts subscriptions by endpoint', async () => {
    const { service, subscriptions } = build();
    await service.saveSubscription('u1', {
      endpoint: 'https://push.example/1',
      keys: { p256dh: 'k', auth: 'a' },
    });
    expect(subscriptions.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', endpoint: 'https://push.example/1' }),
      ['endpoint'],
    );
  });
});