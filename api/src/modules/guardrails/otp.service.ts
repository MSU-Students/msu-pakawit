import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'crypto';
import * as argon2 from 'argon2';
import { Repository } from 'typeorm';
import { OTPLog, OTPStatus } from './entities/otp-log.entity';

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OTPLog)
    private readonly otpRepo: Repository<OTPLog>,
  ) {}

  private normalizeOtpCode(input: string): string {
    return (input ?? '').trim();
  }

  private async otpMatches(storedValue: string, candidate: string): Promise<boolean> {
    const normalized = this.normalizeOtpCode(candidate);
    if (!normalized) return false;

    if (storedValue === normalized) return true;

    try {
      return await argon2.verify(storedValue, normalized);
    } catch {
      return false;
    }
  }

  /**
   * Generates a secure 4-digit numeric OTP with 30-minute validity.
   */
  async generateOtp(errandId: string): Promise<string> {
    const normalizedErrandId = (errandId ?? '').trim();
    if (!normalizedErrandId) {
      throw new BadRequestException('An errand ID is required to generate an OTP.');
    }

    const existingLogs = await this.otpRepo.find({
      where: { errandId: normalizedErrandId },
      order: { createdAt: 'DESC' },
    });

    for (const log of existingLogs) {
      if (log.status === OTPStatus.GENERATED) {
        log.status = OTPStatus.EXPIRED;
        log.lastFailureReason = 'REPLACED_BY_NEW_OTP';
        log.lastAttemptAt = new Date();
        await this.otpRepo.save(log);
      }
    }

    const code = randomInt(1000, 10000).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const otpLog = this.otpRepo.create({
      errandId: normalizedErrandId,
      otpCode: await argon2.hash(code),
      status: OTPStatus.GENERATED,
      attempts: 0,
      expiresAt,
      lastAttemptAt: null,
      lastFailureReason: null,
      verifiedAt: null,
    });

    await this.otpRepo.save(otpLog);
    return code;
  }

  /**
   * Verifies the 4-digit OTP provided at campus drop zone
   */
  async verifyOtp(errandId: string, otpCode: string): Promise<{ success: boolean; message: string }> {
    const normalizedErrandId = (errandId ?? '').trim();
    const normalizedOtpCode = this.normalizeOtpCode(otpCode);

    if (!normalizedErrandId || !/^[0-9]{4}$/.test(normalizedOtpCode)) {
      throw new BadRequestException('A valid 4-digit OTP is required.');
    }

    const log = await this.otpRepo.findOne({
      where: { errandId: normalizedErrandId },
      order: { createdAt: 'DESC' },
    });

    if (!log) {
      throw new BadRequestException('No active OTP found for this errand or already verified.');
    }

    if (log.status === OTPStatus.VERIFIED) {
      throw new BadRequestException('This OTP has already been used and cannot be reused.');
    }

    if (new Date() > (log.expiresAt ?? new Date(0))) {
      log.status = OTPStatus.EXPIRED;
      log.lastFailureReason = 'EXPIRED_OTP';
      log.lastAttemptAt = new Date();
      await this.otpRepo.save(log);
      throw new BadRequestException('OTP code has expired. Please request a new verification code.');
    }

    if (log.attempts >= 5) {
      log.status = OTPStatus.FAILED;
      log.lastFailureReason = 'MAX_ATTEMPTS_REACHED';
      log.lastAttemptAt = new Date();
      await this.otpRepo.save(log);
      throw new BadRequestException('Too many incorrect attempts. Delivery locked for security review.');
    }

    const matches = await this.otpMatches(log.otpCode ?? '', normalizedOtpCode);
    if (!matches) {
      log.attempts += 1;
      log.lastAttemptAt = new Date();
      log.lastFailureReason = 'INVALID_OTP';
      if (log.attempts >= 5) {
        log.status = OTPStatus.FAILED;
      }
      await this.otpRepo.save(log);
      return {
        success: false,
        message: `Invalid OTP code. Attempt ${log.attempts} of 5.`,
      };
    }

    log.status = OTPStatus.VERIFIED;
    log.lastAttemptAt = new Date();
    log.lastFailureReason = null;
    log.verifiedAt = new Date();
    await this.otpRepo.save(log);

    return {
      success: true,
      message: 'OTP verified successfully. Errand handoff confirmed at drop zone.',
    };
  }
}
