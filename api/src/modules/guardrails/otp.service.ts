import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { EmailService } from '../auth/email.service';
import { OTPAttemptLog, OTPAttemptResult } from './entities/otp-attempt-log.entity';
import { OTPLog, OTPStatus } from './entities/otp-log.entity';

const OTP_TTL_MINUTES = 30;
const MAX_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OTPLog)
    private readonly otpRepo: Repository<OTPLog>,
    @InjectRepository(OTPAttemptLog)
    private readonly attemptRepo: Repository<OTPAttemptLog>,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  async createAndDeliverOtp(
    errandId: string,
    recipient: { email: string; fullName: string },
  ): Promise<{ expiresAt: Date }> {
    const now = new Date();
    await this.otpRepo.update(
      { errandId, status: OTPStatus.GENERATED },
      { status: OTPStatus.EXPIRED, expiresAt: now },
    );

    const code = randomInt(1000, 10000).toString();
    const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);
    const otp = await this.otpRepo.save(this.otpRepo.create({
      errandId,
      otpHash: this.hashOtp(errandId, code),
      status: OTPStatus.GENERATED,
      attempts: 0,
      expiresAt,
      verifiedAt: null,
      verifiedByUserId: null,
    }));

    try {
      await this.emailService.sendDeliveryOtp(recipient.email, recipient.fullName, code, expiresAt);
    } catch (error) {
      otp.status = OTPStatus.FAILED;
      await this.otpRepo.save(otp);
      throw error;
    }

    return { expiresAt };
  }

  async verifyOtp(
    errandId: string,
    otpCode: string,
    courierUserId: string,
    manager?: EntityManager,
  ): Promise<{ success: boolean; message: string; otpLogId?: string }> {
    const otpRepository = manager?.getRepository(OTPLog) ?? this.otpRepo;
    const attemptRepository = manager?.getRepository(OTPAttemptLog) ?? this.attemptRepo;
    const query = otpRepository
      .createQueryBuilder('otp')
      .addSelect('otp.otpHash')
      .where('otp.errandId = :errandId', { errandId })
      .orderBy('otp.createdAt', 'DESC');
    if (manager) query.setLock('pessimistic_write');
    const otp = await query.getOne();

    if (!otp) {
      throw new BadRequestException('No active handoff code exists for this delivery.');
    }

    const now = new Date();
    if (otp.status === OTPStatus.FAILED && otp.attempts >= MAX_ATTEMPTS) {
      otp.attempts += 1;
      await otpRepository.save(otp);
      await this.recordAttempt(attemptRepository, otp, courierUserId, OTPAttemptResult.LOCKED);
      return { success: false, message: 'Too many incorrect attempts. Request a new delivery code.' };
    }

    if (otp.status === OTPStatus.EXPIRED) {
      otp.attempts += 1;
      await otpRepository.save(otp);
      await this.recordAttempt(attemptRepository, otp, courierUserId, OTPAttemptResult.EXPIRED);
      return { success: false, message: 'The delivery code has expired. Request a new code.' };
    }

    if (otp.status !== OTPStatus.GENERATED) {
      throw new BadRequestException('No active handoff code exists for this delivery.');
    }

    if (otp.expiresAt.getTime() <= now.getTime()) {
      otp.status = OTPStatus.EXPIRED;
      otp.attempts += 1;
      await otpRepository.save(otp);
      await this.recordAttempt(attemptRepository, otp, courierUserId, OTPAttemptResult.EXPIRED);
      return { success: false, message: 'The delivery code has expired. Request a new code.' };
    }

    const expectedHash = Buffer.from(otp.otpHash, 'hex');
    const providedHash = Buffer.from(this.hashOtp(errandId, otpCode), 'hex');
    const matches = expectedHash.length === providedHash.length && timingSafeEqual(expectedHash, providedHash);

    if (!matches) {
      otp.attempts += 1;
      if (otp.attempts >= MAX_ATTEMPTS) otp.status = OTPStatus.FAILED;
      await otpRepository.save(otp);
      await this.recordAttempt(attemptRepository, otp, courierUserId, OTPAttemptResult.INVALID);
      return {
        success: false,
        message: otp.attempts >= MAX_ATTEMPTS
          ? 'Too many incorrect attempts. Request a new delivery code.'
          : `Invalid delivery code. ${MAX_ATTEMPTS - otp.attempts} attempt(s) remaining.`,
      };
    }

    otp.status = OTPStatus.VERIFIED;
    otp.verifiedAt = now;
    otp.verifiedByUserId = courierUserId;
    await otpRepository.save(otp);
    await this.recordAttempt(attemptRepository, otp, courierUserId, OTPAttemptResult.VERIFIED);

    return {
      success: true,
      message: 'Delivery code verified. Handoff confirmed.',
      otpLogId: otp.id,
    };
  }

  private async recordAttempt(
    repository: Repository<OTPAttemptLog>,
    otp: OTPLog,
    courierUserId: string,
    result: OTPAttemptResult,
  ): Promise<void> {
    await repository.save(repository.create({
      otpLogId: otp.id,
      errandId: otp.errandId,
      attemptedByUserId: courierUserId,
      attemptNumber: otp.attempts + (result === OTPAttemptResult.VERIFIED ? 1 : 0),
      result,
    }));
  }

  private hashOtp(errandId: string, code: string): string {
    const secret = this.config.get<string>('OTP_HASH_SECRET') || this.config.get<string>('JWT_SECRET');
    if (!secret) throw new ServiceUnavailableException('OTP hashing is not configured');
    return createHmac('sha256', secret).update(`${errandId}:${code}`).digest('hex');
  }
}
