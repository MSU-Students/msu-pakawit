import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OTPLog, OTPStatus } from './entities/otp-log.entity';

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OTPLog)
    private readonly otpRepo: Repository<OTPLog>,
  ) {}

  /**
   * Generates a secure 4-digit numeric OTP with 30-minute validity.
   */
  async generateOtp(errandId: string): Promise<string> {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const otpLog = this.otpRepo.create({
      errandId,
      otpCode: code,
      status: OTPStatus.GENERATED,
      attempts: 0,
      expiresAt,
    });

    await this.otpRepo.save(otpLog);
    return code;
  }

  /**
   * Verifies the 4-digit OTP provided at campus drop zone
   */
  async verifyOtp(errandId: string, otpCode: string): Promise<{ success: boolean; message: string }> {
    const log = await this.otpRepo.findOne({
      where: { errandId, status: OTPStatus.GENERATED },
      order: { createdAt: 'DESC' },
    });

    if (!log) {
      throw new BadRequestException('No active OTP found for this errand or already verified.');
    }

    if (new Date() > log.expiresAt) {
      log.status = OTPStatus.EXPIRED;
      await this.otpRepo.save(log);
      throw new BadRequestException('OTP code has expired. Please request a new verification code.');
    }

    if (log.attempts >= 5) {
      log.status = OTPStatus.FAILED;
      await this.otpRepo.save(log);
      throw new BadRequestException('Too many incorrect attempts. Delivery locked for security review.');
    }

    if (log.otpCode !== otpCode) {
      log.attempts += 1;
      await this.otpRepo.save(log);
      return {
        success: false,
        message: `Invalid OTP code. Attempt ${log.attempts} of 5.`,
      };
    }

    log.status = OTPStatus.VERIFIED;
    await this.otpRepo.save(log);

    return {
      success: true,
      message: 'OTP verified successfully. Errand handoff confirmed at drop zone.',
    };
  }
}
