import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DispatchService } from '../modules/dispatch/dispatch.service';
import { ErrandOrder } from '../modules/dispatch/entities/errand-order.entity';

describe('DispatchService order receipt', () => {
  let service: DispatchService;
  let mockOrderRepo: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let nextOrderId: number;

  beforeEach(async () => {
    nextOrderId = 0;
    mockOrderRepo = {
      create: jest.fn((order) => order),
      save: jest.fn((order) =>
        Promise.resolve({
          ...order,
          id: `order-${++nextOrderId}`,
          createdAt: new Date('2026-10-31T17:15:00.000Z'),
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DispatchService,
        {
          provide: getRepositoryToken(ErrandOrder),
          useValue: mockOrderRepo,
        },
      ],
    }).compile();

    service = module.get<DispatchService>(DispatchService);
  });

  it('returns a receipt with the saved order ID and creation timestamp', async () => {
    const receipt = await service.createErrandOrder({
      buyerStudentId: 'student-1',
      storeId: 'store-1',
      items: [],
      totalProductCost: 0,
      convenienceFee: 0,
      totalAmount: 0,
      dropZone: 'Campus Hub',
    });

    expect(receipt.orderId).toBe('order-1');
    expect(receipt.timestamp).toBe('2026-10-31T17:15:00.000Z');
    expect(mockOrderRepo.save).toHaveBeenCalledTimes(1);
  });

  it('generates a different order ID for each order', async () => {
    const order = {
      buyerStudentId: 'student-1',
      storeId: 'store-1',
      items: [],
      totalProductCost: 0,
      convenienceFee: 0,
      totalAmount: 0,
      dropZone: 'Campus Hub',
    };

    const firstReceipt = await service.createErrandOrder(order);
    const secondReceipt = await service.createErrandOrder(order);

    expect(firstReceipt.orderId).not.toBe(secondReceipt.orderId);
  });
});
