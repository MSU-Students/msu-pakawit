import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { OtpService } from '../modules/guardrails/otp.service';
import { OTPAttempt } from '../modules/guardrails/entities/otp-attempt.entity';
import { OTPLog, OTPStatus } from '../modules/guardrails/entities/otp-log.entity';
import { ErrandOrder, ErrandOrderStatus } from '../modules/dispatch/entities/errand-order.entity';

describe('OtpService (courier handoff verification)', () => {
  let service: OtpService;
  let mockOtpRepo: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let mockManager: {
    findOne: jest.Mock;
    save: jest.Mock;
    getRepository: jest.Mock;
  };
  let mockDataSource: {
    transaction: jest.Mock;
    getRepository: jest.Mock;
  };
  let mockAttemptRepo: { save: jest.Mock };

  beforeEach(async () => {
    mockOtpRepo = {
      create: jest.fn((value) => value),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    mockAttemptRepo = { save: jest.fn((value) => Promise.resolve(value)) };
    mockManager = {
      findOne: jest.fn(),
      save: jest.fn((value) => Promise.resolve(value)),
      getRepository: jest.fn((entity) => entity === OTPAttempt ? mockAttemptRepo : mockOtpRepo),
    };
    mockDataSource = {
      transaction: jest.fn((callback) => callback(mockManager)),
      getRepository: jest.fn(() => ({ findOne: jest.fn() })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: getRepositoryToken(OTPLog), useValue: mockOtpRepo },
        { provide: DataSource, useValue: mockDataSource },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-signing-secret-that-is-at-least-32-characters') },
        },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
  });

  it('generates a unique four-digit OTP, stores a hash and encrypted recipient copy, and expires it in five minutes', async () => {
    const before = Date.now();
    const code = await service.generateOtp('ERR-1001');
    const savedLog = mockOtpRepo.save.mock.calls[mockOtpRepo.save.mock.calls.length - 1][0] as OTPLog;

    expect(code).toMatch(/^\d{4}$/);
    expect(savedLog.otpCode).not.toBe(code);
    expect(await argon2.verify(savedLog.otpCode, code)).toBe(true);
    expect(savedLog.encryptedOtp).not.toContain(code);
    expect(savedLog.expiresAt!.getTime()).toBeGreaterThanOrEqual(before + 5 * 60 * 1000);
    expect(savedLog.expiresAt!.getTime()).toBeLessThanOrEqual(Date.now() + 5 * 60 * 1000);
  });

  it('rejects OTP verification by anyone other than the assigned courier and audits the attempt', async () => {
    mockManager.findOne.mockResolvedValue({
      id: 'ERR-1001',
      runnerStudentId: 'courier-1',
      status: ErrandOrderStatus.DELIVERING,
    });
    await expect(service.verifyOtp('ERR-1001', 'other-courier', '1234')).rejects.toThrow(
      ForbiddenException,
    );
    expect(mockAttemptRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'UNAUTHORIZED_COURIER' }),
    );
  });

  it('makes the OTP available only through the recipient lookup and decrypts its protected copy', async () => {
    const code = await service.generateOtp('ERR-1001');
    const savedLog = mockOtpRepo.save.mock.calls[mockOtpRepo.save.mock.calls.length - 1][0] as OTPLog;
    const findRecipientOrder = jest.fn().mockResolvedValue({
      id: 'ERR-1001',
      buyerStudentId: 'buyer-1',
      status: ErrandOrderStatus.DELIVERING,
    });
    mockDataSource.getRepository.mockReturnValue({ findOne: findRecipientOrder });
    mockOtpRepo.findOne.mockResolvedValue(savedLog);

    const result = await service.getRecipientOtp('ERR-1001', 'buyer-1');

    expect(result.otpCode).toBe(code);
    expect(findRecipientOrder).toHaveBeenCalledWith({
      where: { id: 'ERR-1001', buyerStudentId: 'buyer-1' },
    });
  });

  it('verifies the recipient-provided OTP once and records an auditable success', async () => {
    const log: Partial<OTPLog> = {
      id: 'otp-log-1',
      errandId: 'ERR-1001',
      otpCode: await argon2.hash('7429'),
      status: OTPStatus.GENERATED,
      attempts: 0,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    };
    const order: Partial<ErrandOrder> = {
      id: 'ERR-1001',
      runnerStudentId: 'courier-1',
      status: ErrandOrderStatus.DELIVERING,
    };
    mockManager.findOne.mockImplementation((entity) => entity === ErrandOrder
      ? order
      : log);

    const result = await service.verifyOtp('ERR-1001', 'courier-1', '7429');

    expect(result.success).toBe(true);
    expect(log.status).toBe(OTPStatus.VERIFIED);
    expect(log.verifiedByCourierStudentId).toBe('courier-1');
    expect(order.status).toBe(ErrandOrderStatus.COMPLETED);
    expect(order.handoffOtpLogId).toBe('otp-log-1');
    expect(mockAttemptRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'VERIFIED', actorStudentId: 'courier-1' }),
    );
  });

  it('records invalid attempts and invalidates the OTP after five failures', async () => {
    const log: Partial<OTPLog> = {
      id: 'otp-log-1',
      errandId: 'ERR-1001',
      otpCode: await argon2.hash('7429'),
      status: OTPStatus.GENERATED,
      attempts: 0,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    };
    mockManager.findOne.mockImplementation((entity) => entity === ErrandOrder
      ? { id: 'ERR-1001', runnerStudentId: 'courier-1', status: ErrandOrderStatus.DELIVERING }
      : log);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(service.verifyOtp('ERR-1001', 'courier-1', '0000')).rejects.toThrow(
        BadRequestException,
      );
    }

    expect(log.attempts).toBe(5);
    expect(log.status).toBe(OTPStatus.FAILED);
    expect(mockAttemptRepo.save).toHaveBeenCalledTimes(5);
  });

  it('persists an expired status and audit record when the recipient attempts an expired OTP', async () => {
    const log: Partial<OTPLog> = {
      id: 'otp-log-1',
      errandId: 'ERR-1001',
      otpCode: await argon2.hash('7429'),
      status: OTPStatus.GENERATED,
      attempts: 0,
      expiresAt: new Date(Date.now() - 1),
    };
    mockManager.findOne.mockImplementation((entity) => entity === ErrandOrder
      ? { id: 'ERR-1001', runnerStudentId: 'courier-1', status: ErrandOrderStatus.DELIVERING }
      : log);

    await expect(service.verifyOtp('ERR-1001', 'courier-1', '7429')).rejects.toThrow(
      BadRequestException,
    );

    expect(log.status).toBe(OTPStatus.EXPIRED);
    expect(mockAttemptRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ result: 'EXPIRED_OTP' }),
    );
  });
});
