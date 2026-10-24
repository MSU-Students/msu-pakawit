import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { DispatchService } from '../modules/dispatch/dispatch.service';
import { ErrandOrder, ErrandOrderStatus } from '../modules/dispatch/entities/errand-order.entity';
import { OtpService } from '../modules/guardrails/otp.service';

describe('DispatchService handoff verification', () => {
  let service: DispatchService;
  let order: Partial<ErrandOrder>;
  let orderRepo: { findOne: jest.Mock; save: jest.Mock };
  let manager: EntityManager;
  let otpService: { generateOtp: jest.Mock; verifyOtp: jest.Mock };

  beforeEach(() => {
    order = {
      id: 'errand-1',
      status: ErrandOrderStatus.DELIVERING,
      buyerStudentId: 'buyer-1',
      runnerStudentId: 'runner-1',
    };
    orderRepo = {
      findOne: jest.fn().mockResolvedValue(order),
      save: jest.fn(async (entity) => entity),
    };
    manager = {
      getRepository: jest.fn(() => orderRepo),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
    };
    otpService = {
      generateOtp: jest.fn().mockResolvedValue({
        otpCode: '8372',
        expiresAt: new Date(Date.now() + 1_000),
      }),
      verifyOtp: jest.fn(),
    };
    service = new DispatchService(
      orderRepo as unknown as Repository<ErrandOrder>,
      dataSource as unknown as DataSource,
      otpService as unknown as OtpService,
    );
  });

  it('completes delivery and saves proof after successful OTP verification', async () => {
    otpService.verifyOtp.mockResolvedValue({
      success: true,
      verificationId: 'otp-log-1',
      verifiedAt: new Date(),
    });

    const result = await service.verifyHandoff('errand-1', '8372', 'runner-1');

    expect(result.success).toBe(true);
    expect(result.status).toBe(ErrandOrderStatus.COMPLETED);
    expect(order.status).toBe(ErrandOrderStatus.COMPLETED);
    expect(orderRepo.save).toHaveBeenCalledWith(order);
    expect(otpService.verifyOtp).toHaveBeenCalledWith('errand-1', '8372', manager);
  });

  it('does not complete delivery when verification fails', async () => {
    otpService.verifyOtp.mockResolvedValue({ success: false, message: 'Invalid OTP.' });

    const result = await service.verifyHandoff('errand-1', '0000', 'runner-1');

    expect(result.success).toBe(false);
    expect(order.status).toBe(ErrandOrderStatus.DELIVERING);
    expect(orderRepo.save).not.toHaveBeenCalled();
  });

  it('only allows verification while delivery is in progress', async () => {
    order.status = ErrandOrderStatus.ACCEPTED;

    await expect(service.verifyHandoff('errand-1', '8372', 'runner-1')).rejects.toThrow(BadRequestException);
    expect(otpService.verifyOtp).not.toHaveBeenCalled();
  });

  it('only allows the assigned courier to verify the handoff', async () => {
    await expect(service.verifyHandoff('errand-1', '8372', 'other-runner')).rejects.toThrow(BadRequestException);
    expect(otpService.verifyOtp).not.toHaveBeenCalled();
  });

  it('only allows the recipient to request the handoff OTP', async () => {
    await expect(service.generateHandoffOtp('errand-1', 'other-buyer')).rejects.toThrow(BadRequestException);
    expect(otpService.generateOtp).not.toHaveBeenCalled();
  });

  it('blocks status updates from bypassing handoff verification', async () => {
    await expect(
      service.updateErrandStatus('errand-1', ErrandOrderStatus.COMPLETED),
    ).rejects.toThrow(BadRequestException);
  });

  it('issues the OTP through the recipient-screen delivery channel', async () => {
    const result = await service.generateHandoffOtp('errand-1', 'buyer-1');

    expect(result.deliveryMethod).toBe('recipient-screen');
    expect(result.otpCode).toBe('8372');
    expect(otpService.generateOtp).toHaveBeenCalledWith('errand-1', manager);
  });

  it('rejects OTP generation for missing errands', async () => {
    orderRepo.findOne.mockResolvedValue(null);

    await expect(service.generateHandoffOtp('missing', 'buyer-1')).rejects.toThrow(NotFoundException);
  });
});
