import { Repository } from 'typeorm';
import { DispatchService } from '../modules/dispatch/dispatch.service';
import { ErrandOrder, ErrandOrderStatus } from '../modules/dispatch/entities/errand-order.entity';
import { User } from '../modules/users/entities/user.entity';
import { PushNotificationsService } from '../modules/notifications/push-notifications.service';

describe('DispatchService push notifications', () => {
  let service: DispatchService;
  let orderRepo: jest.Mocked<Pick<Repository<ErrandOrder>, 'findOne' | 'save'>>;
  let userRepo: jest.Mocked<Pick<Repository<User>, 'findOne'>>;
  let notifications: jest.Mocked<Pick<PushNotificationsService, 'notifyErrandStatusChanged' | 'notifyErrandAssigned'>>;

  const errand: ErrandOrder = {
    id: 'errand-uuid',
    buyerStudentId: '2023-01429',
    runnerStudentId: null,
    storeId: 'store-uuid',
    items: [],
    totalProductCost: 0,
    convenienceFee: 0,
    totalAmount: 0,
    dropZone: 'Science Complex',
    status: ErrandOrderStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    orderRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    } as jest.Mocked<Pick<Repository<ErrandOrder>, 'findOne' | 'save'>>;
    userRepo = { findOne: jest.fn() } as jest.Mocked<Pick<Repository<User>, 'findOne'>>;
    notifications = {
      notifyErrandStatusChanged: jest.fn().mockResolvedValue(undefined),
      notifyErrandAssigned: jest.fn().mockResolvedValue(undefined),
    } as jest.Mocked<Pick<PushNotificationsService, 'notifyErrandStatusChanged' | 'notifyErrandAssigned'>>;
    service = new DispatchService(
      orderRepo as unknown as Repository<ErrandOrder>,
      userRepo as unknown as Repository<User>,
      notifications as unknown as PushNotificationsService,
    );
  });

  it('notifies the buyer about a status change', async () => {
    orderRepo.findOne.mockResolvedValue({ ...errand });
    orderRepo.save.mockImplementation(async (order) => order as ErrandOrder);

    await service.updateErrandStatus(errand.id, ErrandOrderStatus.PURCHASED);

    expect(notifications.notifyErrandStatusChanged).toHaveBeenCalledWith(
      expect.objectContaining({ id: errand.id, status: ErrandOrderStatus.PURCHASED }),
    );
  });

  it('notifies both buyer and assigned courier when an errand is claimed', async () => {
    orderRepo.findOne.mockResolvedValue({ ...errand });
    orderRepo.save.mockImplementation(async (order) => order as ErrandOrder);

    await service.claimErrand(errand.id, { runnerStudentId: '2023-08888' });

    expect(notifications.notifyErrandStatusChanged).toHaveBeenCalledWith(
      expect.objectContaining({ status: ErrandOrderStatus.ACCEPTED }),
    );
    expect(notifications.notifyErrandAssigned).toHaveBeenCalledWith(
      expect.objectContaining({ runnerStudentId: '2023-08888' }),
    );
  });

  it('does not emit duplicate status notifications for an unchanged status', async () => {
    orderRepo.findOne.mockResolvedValue({ ...errand });
    orderRepo.save.mockImplementation(async (order) => order as ErrandOrder);

    await service.updateErrandStatus(errand.id, ErrandOrderStatus.PENDING);

    expect(notifications.notifyErrandStatusChanged).not.toHaveBeenCalled();
  });
});
