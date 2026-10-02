import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OtpService } from '../modules/guardrails/otp.service';
import { OTPLog, OTPStatus } from '../modules/guardrails/entities/otp-log.entity';
import { BadRequestException } from '@nestjs/common';

describe('OtpService (Drop-Zone Handoff Security)', () => {
  let service: OtpService;
  let mockOtpRepo: any;

  beforeEach(async () => {
    mockOtpRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: getRepositoryToken(OTPLog),
          useValue: mockOtpRepo,
        },
      ],
    }).compile();

    service = module.get<OtpService>(OtpService);
  });

  it('should generate a 4-digit numeric OTP', async () => {
    const code = await service.generateOtp('ERR-1001');
    expect(code).toBeDefined();
    expect(code).toHaveLength(4);
    expect(/^\d{4}$/.test(code)).toBe(true);
  });

  it('should successfully verify matching OTP', async () => {
    const mockLog: Partial<OTPLog> = {
      errandId: 'ERR-1001',
      otpCode: '7429',
      status: OTPStatus.GENERATED,
      attempts: 0,
      expiresAt: new Date(Date.now() + 1000 * 60 * 10), // 10 mins in future
    };

    mockOtpRepo.findOne.mockResolvedValue(mockLog);

    const result = await service.verifyOtp('ERR-1001', '7429');
    expect(result.success).toBe(true);
    expect(mockLog.status).toBe(OTPStatus.VERIFIED);
  });

  it('should increment attempt counter on incorrect OTP', async () => {
    const mockLog: Partial<OTPLog> = {
      errandId: 'ERR-1001',
      otpCode: '7429',
      status: OTPStatus.GENERATED,
      attempts: 0,
      expiresAt: new Date(Date.now() + 1000 * 60 * 10),
    };

    mockOtpRepo.findOne.mockResolvedValue(mockLog);

    const result = await service.verifyOtp('ERR-1001', '0000');
    expect(result.success).toBe(false);
    expect(mockLog.attempts).toBe(1);
  });

  it('should throw BadRequestException if OTP is expired', async () => {
    const mockLog: Partial<OTPLog> = {
      errandId: 'ERR-1001',
      otpCode: '7429',
      status: OTPStatus.GENERATED,
      attempts: 0,
      expiresAt: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
    };

    mockOtpRepo.findOne.mockResolvedValue(mockLog);

    await expect(service.verifyOtp('ERR-1001', '7429')).rejects.toThrow(BadRequestException);
  });
});
