import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DispatchService } from '../modules/dispatch/dispatch.service';
import { ErrandOrderStatus } from '../modules/dispatch/entities/errand-order.entity';

const validDto = {
  buyerStudentId: '2023-01429',
  storeId: 'store-1',
  items: [{ productId: 'p1', name: 'Yellow Pad', quantity: 2, unitPrice: 49.5 }],
  totalProductCost: 99,
  convenienceFee: 35,
  totalAmount: 134,
  dropZone: 'Science Complex Drop Hub',
};

const ORDER_ID = '12345678-aaaa-bbbb-cccc-1234567890ab';

function build() {
  const orderRepo = {
    create: jest.fn((v: object) => ({ ...v })),
    save: jest.fn(async (v: object) => ({
      ...v,
      id: ORDER_ID,
      createdAt: new Date('2026-10-19T08:00:00.000Z'),
      runnerStudentId: null,
    })),
    findOne: jest.fn(),
    find: jest.fn(),
  };
  return { service: new DispatchService(orderRepo as never), orderRepo };
}

describe('DispatchService order creation', () => {
  it('creates the order as PENDING and returns a receipt with id and timestamp', async () => {
    const { service, orderRepo } = build();
    const receipt = await service.createErrandOrder(validDto);

    expect(orderRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: ErrandOrderStatus.PENDING }),
    );
    expect(receipt.orderId).toBe(ORDER_ID);
    expect(receipt.receiptNumber).toBe('PKW-12345678');
    expect(receipt.issuedAt).toBe('2026-10-19T08:00:00.000Z');
    expect(receipt.status).toBe(ErrandOrderStatus.PENDING);
    expect(receipt.items[0].lineTotal).toBe(99);
    expect(receipt.totalAmount).toBe(134);
  });

  it('rejects an order whose totals do not match the items', async () => {
    const { service, orderRepo } = build();
    await expect(
      service.createErrandOrder({ ...validDto, totalAmount: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(orderRepo.save).not.toHaveBeenCalled();
  });

  it('builds a receipt from a stored order (decimal strings become numbers)', async () => {
    const { service, orderRepo } = build();
    orderRepo.findOne.mockResolvedValue({
      ...validDto,
      id: ORDER_ID,
      status: ErrandOrderStatus.PENDING,
      createdAt: new Date('2026-10-19T08:00:00.000Z'),
      totalProductCost: '99.00',
      convenienceFee: '35.00',
      totalAmount: '134.00',
    });
    const receipt = await service.getReceipt(ORDER_ID);
    expect(receipt.totalAmount).toBe(134);
    expect(receipt.deliveryAddress).toBe('Science Complex Drop Hub');
  });

  it('throws NotFound for an unknown order', async () => {
    const { service, orderRepo } = build();
    orderRepo.findOne.mockResolvedValue(null);
    await expect(service.getReceipt(ORDER_ID)).rejects.toBeInstanceOf(NotFoundException);
  });
});