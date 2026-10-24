import { Injectable, BadRequestException } from '@nestjs/common';
import { randomInt } from 'crypto';
import * as argon2 from 'argon2';
import { DataSource, EntityManager } from 'typeorm';
import { OTPLog, OTPStatus } from './entities/otp-log.entity';
import { OTPAttempt, OTPAttemptResult } from './entities/otp-attempt.entity';

@Injectable()
export class OtpService {
  constructor(private readonly dataSource: DataSource) {}

  private normalizeOtpCode(input: string): string {
    return (input ?? '').trim();
  }

  private async otpMatches(storedValue: string, candidate: string): Promise<boolean> {
    const normalized = this.normalizeOtpCode(candidate);
    if (!normalized) return false;
    return argon2.verify(storedValue, normalized);
  }

  /**
   * Generates a secure 4-digit numeric OTP with 30-minute validity.
   */
  async generateOtp(
    errandId: string,
    manager?: EntityManager,
  ): Promise<{ otpCode: string; expiresAt: Date }> {
    const normalizedErrandId = (errandId ?? '').trim();
    if (!normalizedErrandId) {
      throw new BadRequestException('An errand ID is required to generate an OTP.');
    }

    const createOtp = async (transactionManager: EntityManager) => {
      const otpRepo = transactionManager.getRepository(OTPLog);
      const existingLogs = await otpRepo.find({
        where: { errandId: normalizedErrandId, status: OTPStatus.GENERATED },
        order: { createdAt: 'DESC' },
      });

      for (const log of existingLogs) {
        log.status = OTPStatus.EXPIRED;
        log.lastFailureReason = 'REPLACED_BY_NEW_OTP';
        log.lastAttemptAt = new Date();
        await otpRepo.save(log);
      }

      const code = randomInt(1000, 10000).toString();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      const otpLog = otpRepo.create({
        errandId: normalizedErrandId,
        otpCode: await argon2.hash(code),
        status: OTPStatus.GENERATED,
        attempts: 0,
        expiresAt,
        lastAttemptAt: null,
        lastFailureReason: null,
        verifiedAt: null,
      });

      await otpRepo.save(otpLog);
      return { otpCode: code, expiresAt };
    };

    return manager ? createOtp(manager) : this.dataSource.transaction(createOtp);
  }

  /**
   * Verifies an OTP and records an audit event for the errand handoff.
   */
  async verifyOtp(
    errandId: string,
    otpCode: string,
    manager?: EntityManager,
  ): Promise<{ success: boolean; message: string; verificationId?: string; verifiedAt?: Date }> {
    const normalizedErrandId = (errandId ?? '').trim();
    const normalizedOtpCode = this.normalizeOtpCode(otpCode);

    if (!normalizedErrandId) {
      throw new BadRequestException('An errand ID is required to verify an OTP.');
    }

    const verify = async (transactionManager: EntityManager) => {
      const otpRepo = transactionManager.getRepository(OTPLog);
      const attemptRepo = transactionManager.getRepository(OTPAttempt);
      const log = await otpRepo.findOne({
        where: { errandId: normalizedErrandId },
        order: { createdAt: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });

      if (!log) {
        throw new BadRequestException('No active OTP found for this errand.');
      }

      const recordAttempt = async (result: OTPAttemptResult) => {
        await attemptRepo.save(attemptRepo.create({
          errandId: normalizedErrandId,
          otpLog: log,
          result,
          attemptedAt: new Date(),
        }));
      };

      if (log.status === OTPStatus.VERIFIED) {
        await recordAttempt(OTPAttemptResult.ALREADY_USED);
        return { success: false, message: 'This OTP has already been used and cannot be reused.' };
      }

      if (log.status === OTPStatus.EXPIRED || !log.expiresAt || log.expiresAt.getTime() <= Date.now()) {
        log.status = OTPStatus.EXPIRED;
        log.attempts += 1;
        log.lastFailureReason = 'EXPIRED_OTP';
        log.lastAttemptAt = new Date();
        await otpRepo.save(log);
        await recordAttempt(OTPAttemptResult.EXPIRED);
        return { success: false, message: 'OTP code has expired. Please request a new verification code.' };
      }

      if (log.status === OTPStatus.FAILED || log.attempts >= 5) {
        log.status = OTPStatus.FAILED;
        log.lastFailureReason = 'MAX_ATTEMPTS_REACHED';
        log.lastAttemptAt = new Date();
        await otpRepo.save(log);
        await recordAttempt(OTPAttemptResult.MAX_ATTEMPTS_REACHED);
        return { success: false, message: 'Too many incorrect attempts. Delivery locked for security review.' };
      }

      if (!/^[0-9]{4}$/.test(normalizedOtpCode)) {
        log.attempts += 1;
        log.lastAttemptAt = new Date();
        log.lastFailureReason = 'INVALID_OTP';
        if (log.attempts >= 5) {
          log.status = OTPStatus.FAILED;
        }
        await otpRepo.save(log);
        await recordAttempt(OTPAttemptResult.INVALID);
        return {
          success: false,
          message: log.attempts >= 5
            ? 'Too many incorrect attempts. Delivery locked for security review.'
            : `Invalid OTP code. Attempt ${log.attempts} of 5.`,
        };
      }

      const matches = await this.otpMatches(log.otpCode ?? '', normalizedOtpCode);
      if (!matches) {
        log.attempts += 1;
        log.lastAttemptAt = new Date();
        log.lastFailureReason = 'INVALID_OTP';
        if (log.attempts >= 5) {
          log.status = OTPStatus.FAILED;
        }
        await otpRepo.save(log);
        await recordAttempt(OTPAttemptResult.INVALID);
        return {
          success: false,
          message: log.attempts >= 5
            ? 'Too many incorrect attempts. Delivery locked for security review.'
            : `Invalid OTP code. Attempt ${log.attempts} of 5.`,
        };
      }

      log.status = OTPStatus.VERIFIED;
      log.lastAttemptAt = new Date();
      log.lastFailureReason = null;
      log.verifiedAt = new Date();
      await otpRepo.save(log);
      await recordAttempt(OTPAttemptResult.VERIFIED);

      return {
        success: true,
        message: 'OTP verified successfully. Errand handoff confirmed at drop zone.',
        verificationId: log.id,
        verifiedAt: log.verifiedAt,
      };
    };

    return manager ? verify(manager) : this.dataSource.transaction(verify);
  }
}
