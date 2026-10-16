import { createHmac } from 'crypto';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { EmailService } from '../modules/auth/email.service';
import { OTPAttemptLog, OTPAttemptResult } from '../modules/guardrails/entities/otp-attempt-log.entity';
import { OTPLog, OTPStatus } from '../modules/guardrails/entities/otp-log.entity';
import { OtpService } from '../modules/guardrails/otp.service';

describe('OtpService delivery handoff', () => {
  let service: OtpService;
  let otpRepo: any;
  let attemptRepo: any;
  let emailService: { sendDeliveryOtp: jest.Mock };
  let currentOtp: Partial<OTPLog>;
  const secret = 'test-otp-secret';

  const hash = (errandId: string, code: string) =>
    createHmac('sha256', secret).update(`${errandId}:${code}`).digest('hex');

  beforeEach(async () => {
    otpRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn(async (entity) => entity),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    attemptRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn(async (entity) => entity),
    };
    emailService = { sendDeliveryOtp: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: getRepositoryToken(OTPLog), useValue: otpRepo },
        { provide: getRepositoryToken(OTPAttemptLog), useValue: attemptRepo },
        { provide: EmailService, useValue: emailService },
        { provide: ConfigService, useValue: { get: jest.fn(() => secret) } },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
  });

  const setCurrentOtp = (overrides: Partial<OTPLog> = {}) => {
    currentOtp = {
      id: 'otp-log-1',
      errandId: 'errand-1',
      otpHash: hash('errand-1', '7429'),
      status: OTPStatus.GENERATED,
      attempts: 0,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      ...overrides,
    };
    const query = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => currentOtp),
    };
    otpRepo.createQueryBuilder.mockReturnValue(query);
    return query;
  };

  it('emails a generated four-digit OTP and stores only its keyed hash', async () => {
    const result = await service.createAndDeliverOtp('errand-1', {
      email: 'buyer@msu.edu.ph',
      fullName: 'MSU Buyer',
    });

    expect(otpRepo.update).toHaveBeenCalledWith(
      { errandId: 'errand-1', status: OTPStatus.GENERATED },
      expect.objectContaining({ status: OTPStatus.EXPIRED }),
    );
    const savedOtp = otpRepo.save.mock.calls[0][0];
    expect(savedOtp.otpHash).toMatch(/^[a-f0-9]{64}$/);
    expect(savedOtp.otpCode).toBeUndefined();
    expect(emailService.sendDeliveryOtp).toHaveBeenCalledWith(
      'buyer@msu.edu.ph',
      'MSU Buyer',
      expect.stringMatching(/^\d{4}$/),
      result.expiresAt,
    );
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('verifies a matching code and records the verified courier and attempt', async () => {
    setCurrentOtp();

    const result = await service.verifyOtp('errand-1', '7429', 'courier-user-1');

    expect(result).toMatchObject({ success: true, otpLogId: 'otp-log-1' });
    expect(currentOtp.status).toBe(OTPStatus.VERIFIED);
    expect(currentOtp.verifiedByUserId).toBe('courier-user-1');
    expect(attemptRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      attemptedByUserId: 'courier-user-1',
      result: OTPAttemptResult.VERIFIED,
    }));
  });

  it('increments the counter and stores timestamped metadata for invalid attempts', async () => {
    setCurrentOtp();

    const result = await service.verifyOtp('errand-1', '0000', 'courier-user-1');

    expect(result.success).toBe(false);
    expect(currentOtp.attempts).toBe(1);
    expect(attemptRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      result: OTPAttemptResult.INVALID,
      attemptNumber: 1,
      attemptedByUserId: 'courier-user-1',
    }));
  });

  it('expires an overdue code and logs the failed verification', async () => {
    setCurrentOtp({ expiresAt: new Date(Date.now() - 1000) });

    const result = await service.verifyOtp('errand-1', '7429', 'courier-user-1');

    expect(result.success).toBe(false);
    expect(currentOtp.status).toBe(OTPStatus.EXPIRED);
    expect(attemptRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      result: OTPAttemptResult.EXPIRED,
    }));
  });

  it('locks the code after five failed attempts', async () => {
    setCurrentOtp({ attempts: 4 });

    const result = await service.verifyOtp('errand-1', '0000', 'courier-user-1');

    expect(result.success).toBe(false);
    expect(currentOtp.attempts).toBe(5);
    expect(currentOtp.status).toBe(OTPStatus.FAILED);

    await service.verifyOtp('errand-1', '7429', 'courier-user-1');
    expect(attemptRepo.save).toHaveBeenLastCalledWith(expect.objectContaining({
      result: OTPAttemptResult.LOCKED,
      attemptNumber: 6,
    }));
  });

  it('invalidates an undelivered code when SMTP delivery fails', async () => {
    emailService.sendDeliveryOtp.mockRejectedValue(new Error('SMTP unavailable'));

    await expect(service.createAndDeliverOtp('errand-1', {
      email: 'buyer@msu.edu.ph',
      fullName: 'MSU Buyer',
    })).rejects.toThrow('SMTP unavailable');

    expect(otpRepo.save).toHaveBeenLastCalledWith(expect.objectContaining({
      status: OTPStatus.FAILED,
    }));
  });

  it('rejects verification when no active code exists', async () => {
    const query = setCurrentOtp();
    query.getOne.mockResolvedValue(null);

    await expect(service.verifyOtp('errand-1', '7429', 'courier-user-1'))
      .rejects.toThrow(BadRequestException);
  });
});
