import { ForbiddenException } from '@nestjs/common';
import { DispatchService } from '../modules/dispatch/dispatch.service';
import { ErrandOrder, ErrandOrderStatus } from '../modules/dispatch/entities/errand-order.entity';
import { User, UserRole } from '../modules/users/entities/user.entity';
import { OtpService } from '../modules/guardrails/otp.service';

describe('DispatchService (OTP-protected handoff)', () => {
  let service: DispatchService;
  let mockManager: { findOne: jest.Mock; save: jest.Mock };
  let mockOtpService: { generateOtp: jest.Mock; verifyOtp: jest.Mock };
  const courier = {
    msuIdNumber: 'courier-1',
    role: UserRole.COURIER,
    isCourierVerified: true,
  } as User;

  beforeEach(() => {
    mockManager = {
      findOne: jest.fn(),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    mockOtpService = {
      generateOtp: jest.fn().mockResolvedValue('1234'),
      verifyOtp: jest.fn().mockResolvedValue({
        order: { id: 'ERR-1001', status: ErrandOrderStatus.COMPLETED },
      }),
    };
    const dataSource = {
      transaction: jest.fn((callback) => callback(mockManager)),
    };
    const orderRepo = {
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve(value)),
      find: jest.fn(),
      findOne: jest.fn(),
    };
    service = new DispatchService(orderRepo as never, dataSource as never, mockOtpService as never);
  });

  it('generates the OTP in the transaction that moves the assigned errand into delivery', async () => {
    const order: Partial<ErrandOrder> = {
      id: 'ERR-1001',
      runnerStudentId: 'courier-1',
      status: ErrandOrderStatus.PURCHASED,
    };
    mockManager.findOne.mockResolvedValue(order);

    const updated = await service.updateErrandStatus(
      'ERR-1001',
      ErrandOrderStatus.DELIVERING,
      courier,
    );

    expect(mockOtpService.generateOtp).toHaveBeenCalledWith('ERR-1001', mockManager);
    expect(updated.status).toBe(ErrandOrderStatus.DELIVERING);
  });

  it('passes the courier-provided OTP to backend verification before returning completion', async () => {
    const completed = await service.completeHandoff('ERR-1001', '7429', courier);

    expect(mockOtpService.verifyOtp).toHaveBeenCalledWith('ERR-1001', 'courier-1', '7429');
    expect(completed.status).toBe(ErrandOrderStatus.COMPLETED);
  });

  it('rejects a different courier from updating an assigned delivery', async () => {
    mockManager.findOne.mockResolvedValue({
      id: 'ERR-1001',
      runnerStudentId: 'another-courier',
      status: ErrandOrderStatus.PURCHASED,
    });

    await expect(service.updateErrandStatus(
      'ERR-1001',
      ErrandOrderStatus.DELIVERING,
      courier,
    )).rejects.toThrow(ForbiddenException);
    expect(mockOtpService.generateOtp).not.toHaveBeenCalled();
  });
});
