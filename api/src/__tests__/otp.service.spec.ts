import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, EntityManager } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { OtpService } from '../modules/guardrails/otp.service';
import { OTPLog, OTPStatus } from '../modules/guardrails/entities/otp-log.entity';
import { OTPAttemptResult } from '../modules/guardrails/entities/otp-attempt.entity';

describe('OtpService (Drop-Zone Handoff Security)', () => {
  let service: OtpService;
  let manager: EntityManager;
  let otpRepo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let attemptRepo: {
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    otpRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn(async (entity) => entity),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
    };
    attemptRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn(async (entity) => entity),
    };
    manager = {
      getRepository: jest.fn((entity) => entity === OTPLog ? otpRepo : attemptRepo),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: jest.fn((callback) => callback(manager)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
  });

  it('generates a random 4-digit OTP and stores only its hash', async () => {
    const generated = await service.generateOtp('ERR-1001');
    const savedLog = otpRepo.save.mock.calls[0][0] as OTPLog;

    expect(generated.otpCode).toMatch(/^\d{4}$/);
    expect(generated.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(savedLog.otpCode).not.toBe(generated.otpCode);
    await expect(argon2.verify(savedLog.otpCode, generated.otpCode)).resolves.toBe(true);
  });

  it('records successful verification and marks the OTP as one-time used', async () => {
    const log: Partial<OTPLog> = {
      id: 'otp-log-1',
      errandId: 'ERR-1001',
      otpCode: await argon2.hash('7429'),
      status: OTPStatus.GENERATED,
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    };
    otpRepo.findOne.mockResolvedValue(log);

    const result = await service.verifyOtp('ERR-1001', '7429');

    expect(result.success).toBe(true);
    expect(result.verificationId).toBe(log.id);
    expect(log.status).toBe(OTPStatus.VERIFIED);
    expect(attemptRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      errandId: 'ERR-1001',
      otpLog: expect.objectContaining({ id: log.id }),
      result: OTPAttemptResult.VERIFIED,
    }));
  });

  it('records each invalid attempt and locks the OTP after five failures', async () => {
    const log: Partial<OTPLog> = {
      id: 'otp-log-1',
      errandId: 'ERR-1001',
      otpCode: await argon2.hash('7429'),
      status: OTPStatus.GENERATED,
      attempts: 4,
      expiresAt: new Date(Date.now() + 60_000),
    };
    otpRepo.findOne.mockResolvedValue(log);

    const result = await service.verifyOtp('ERR-1001', '0000');

    expect(result.success).toBe(false);
    expect(log.attempts).toBe(5);
    expect(log.status).toBe(OTPStatus.FAILED);
    expect(attemptRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      result: OTPAttemptResult.INVALID,
      attemptedAt: expect.any(Date),
    }));

    const lockedResult = await service.verifyOtp('ERR-1001', '7429');
    expect(lockedResult.success).toBe(false);
    expect(attemptRepo.save).toHaveBeenLastCalledWith(expect.objectContaining({
      result: OTPAttemptResult.MAX_ATTEMPTS_REACHED,
    }));
  });

  it('records an expired verification attempt and rejects it', async () => {
    const log: Partial<OTPLog> = {
      id: 'otp-log-1',
      errandId: 'ERR-1001',
      otpCode: await argon2.hash('7429'),
      status: OTPStatus.GENERATED,
      attempts: 0,
      expiresAt: new Date(Date.now() - 60_000),
    };
    otpRepo.findOne.mockResolvedValue(log);

    const result = await service.verifyOtp('ERR-1001', '7429');

    expect(result.success).toBe(false);
    expect(log.status).toBe(OTPStatus.EXPIRED);
    expect(attemptRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      result: OTPAttemptResult.EXPIRED,
    }));
  });

  it('records attempts to reuse a verified OTP', async () => {
    otpRepo.findOne.mockResolvedValue({
      id: 'otp-log-1',
      errandId: 'ERR-1001',
      otpCode: await argon2.hash('7429'),
      status: OTPStatus.VERIFIED,
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    });

    const result = await service.verifyOtp('ERR-1001', '7429');

    expect(result.success).toBe(false);
    expect(attemptRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      result: OTPAttemptResult.ALREADY_USED,
    }));
  });

  it('rejects attempts without a generated OTP', async () => {
    otpRepo.findOne.mockResolvedValue(null);
    await expect(service.verifyOtp('ERR-1001', '7429')).rejects.toThrow(BadRequestException);
  });

  it('records malformed code attempts against the attempt limit', async () => {
    const log: Partial<OTPLog> = {
      id: 'otp-log-1',
      errandId: 'ERR-1001',
      otpCode: await argon2.hash('7429'),
      status: OTPStatus.GENERATED,
      attempts: 0,
      expiresAt: new Date(Date.now() + 60_000),
    };
    otpRepo.findOne.mockResolvedValue(log);

    const result = await service.verifyOtp('ERR-1001', 'abc');

    expect(result.success).toBe(false);
    expect(log.attempts).toBe(1);
    expect(attemptRepo.save).toHaveBeenCalledWith(expect.objectContaining({
      result: OTPAttemptResult.INVALID,
    }));
  });
});
