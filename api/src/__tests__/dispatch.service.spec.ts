import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DispatchService } from '../modules/dispatch/dispatch.service';
import { ErrandOrder, ErrandOrderStatus } from '../modules/dispatch/entities/errand-order.entity';
import { ScheduleGuardService } from '../modules/guardrails/schedule-guard.service';
import { OtpService } from '../modules/guardrails/otp.service';
import { UserService } from '../modules/users/user.service';

describe('DispatchService courier ownership', () => {
  let service: DispatchService;
  let order: Partial<ErrandOrder>;
  const orderRepository: any = {
    create: jest.fn((value) => value),
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const scheduleGuard = {
    authorizeRestrictedActivity: jest.fn().mockResolvedValue(undefined),
  };
  const otpService = {
    createAndDeliverOtp: jest.fn().mockResolvedValue({ expiresAt: new Date() }),
    verifyOtp: jest.fn(),
  };
  const userService = {
    findByMsuIdWithSchedules: jest.fn().mockResolvedValue({
      email: 'buyer@msu.edu.ph',
      fullName: 'MSU Buyer',
    }),
  };
  const manager = {
    getRepository: jest.fn(),
  };
  const transaction = jest.fn(async (callback) => callback(manager));

  beforeEach(() => {
    jest.clearAllMocks();
    order = {
      id: 'errand-1',
      runnerStudentId: '2026-01429',
      status: ErrandOrderStatus.ACCEPTED,
      buyerStudentId: 'buyer-id',
    };
    orderRepository.findOne.mockResolvedValue(order);
    orderRepository.save.mockImplementation(async (value) => value);
    orderRepository.manager = { transaction };
    manager.getRepository.mockReturnValue(orderRepository);
    service = new DispatchService(
      orderRepository as unknown as Repository<ErrandOrder>,
      scheduleGuard as unknown as ScheduleGuardService,
      otpService as unknown as OtpService,
      userService as unknown as UserService,
    );
  });

  it('emails the buyer a handoff code when the assigned courier starts delivery', async () => {
    const updated = await service.updateErrandStatus(
      'errand-1',
      ErrandOrderStatus.DELIVERING,
      '2026-01429',
      'courier-1',
    );
    expect(updated.status).toBe(ErrandOrderStatus.DELIVERING);
    expect(otpService.createAndDeliverOtp).toHaveBeenCalledWith('errand-1', {
      email: 'buyer@msu.edu.ph',
      fullName: 'MSU Buyer',
    });
    expect(orderRepository.save).toHaveBeenCalledWith(order);
    expect(scheduleGuard.authorizeRestrictedActivity).toHaveBeenCalledWith(
      'courier-1',
      '2026-01429',
      'UPDATE_ERRAND_DELIVERING',
    );
  });

  it('rejects status updates from a different courier', async () => {
    await expect(service.updateErrandStatus(
      'errand-1',
      ErrandOrderStatus.DELIVERING,
      '2026-09999',
      'courier-1',
    )).rejects.toBeInstanceOf(ForbiddenException);
    expect(orderRepository.save).not.toHaveBeenCalled();
  });

  it('checks the academic schedule before creating an errand', async () => {
    await service.createErrandOrder({ storeId: 'store-1' } as any, 'buyer-id', 'buyer-user-id');
    expect(scheduleGuard.authorizeRestrictedActivity).toHaveBeenCalledWith(
      'buyer-user-id',
      'buyer-id',
      'PLACE_ERRAND',
    );
  });

  it('does not allow a courier to skip handoff verification by setting COMPLETED', async () => {
    await expect(service.updateErrandStatus(
      'errand-1',
      ErrandOrderStatus.COMPLETED,
      '2026-01429',
      'courier-1',
    )).rejects.toBeInstanceOf(BadRequestException);
    expect(orderRepository.save).not.toHaveBeenCalled();
  });

  it('records the OTP proof and completion together after a valid handoff', async () => {
    order.status = ErrandOrderStatus.DELIVERING;
    otpService.verifyOtp.mockResolvedValue({
      success: true,
      message: 'Delivery code verified. Handoff confirmed.',
      otpLogId: 'otp-proof-1',
    });

    const result = await service.completeErrandWithOtp(
      'errand-1',
      '7429',
      '2026-01429',
      'courier-1',
    );

    expect(transaction).toHaveBeenCalled();
    expect(otpService.verifyOtp).toHaveBeenCalledWith('errand-1', '7429', 'courier-1', manager);
    expect(result.success).toBe(true);
    expect(order).toMatchObject({
      status: ErrandOrderStatus.COMPLETED,
      deliveryOtpLogId: 'otp-proof-1',
    });
    expect(order.deliveryCompletedAt).toBeInstanceOf(Date);
    expect(orderRepository.save).toHaveBeenCalledWith(order);
  });

  it('leaves the errand in transit after an invalid handoff code', async () => {
    order.status = ErrandOrderStatus.DELIVERING;
    otpService.verifyOtp.mockResolvedValue({
      success: false,
      message: 'Invalid delivery code.',
    });

    const result = await service.completeErrandWithOtp(
      'errand-1',
      '0000',
      '2026-01429',
      'courier-1',
    );

    expect(result.success).toBe(false);
    expect(order.status).toBe(ErrandOrderStatus.DELIVERING);
    expect(orderRepository.save).not.toHaveBeenCalled();
  });
});
