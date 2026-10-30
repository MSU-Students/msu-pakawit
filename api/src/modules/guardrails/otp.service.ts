import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from 'crypto';
import * as argon2 from 'argon2';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ErrandOrder, ErrandOrderStatus } from '../dispatch/entities/errand-order.entity';
import { OTPAttempt } from './entities/otp-attempt.entity';
import { OTPLog, OTPStatus } from './entities/otp-log.entity';

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OTPLog)
    private readonly otpRepo: Repository<OTPLog>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async generateOtp(errandId: string, manager?: EntityManager): Promise<string> {
    const normalizedErrandId = (errandId ?? '').trim();
    if (!normalizedErrandId) {
      throw new BadRequestException('An errand ID is required to generate an OTP.');
    }

    const repository = manager?.getRepository(OTPLog) ?? this.otpRepo;
    const existingLogs = await repository.find({
      where: { errandId: normalizedErrandId },
      order: { createdAt: 'DESC' },
    });

    for (const log of existingLogs) {
      if (log.status === OTPStatus.GENERATED) {
        log.status = OTPStatus.EXPIRED;
        log.lastFailureReason = 'REPLACED_BY_NEW_OTP';
        log.lastAttemptAt = new Date();
        await repository.save(log);
      }
    }

    let code = randomInt(1000, 10000).toString();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      let alreadyIssued = false;
      for (const previousLog of existingLogs) {
        if (previousLog.encryptedOtp && this.decryptOtp(previousLog.encryptedOtp) === code) {
          alreadyIssued = true;
          break;
        }
        if (previousLog.otpCode === code) {
          alreadyIssued = true;
          break;
        }
        if (
          previousLog.otpCode.startsWith('$argon2')
          && await argon2.verify(previousLog.otpCode, code)
        ) {
          alreadyIssued = true;
          break;
        }
      }
      if (!alreadyIssued) break;
      if (attempt === 9) throw new Error('Unable to generate a unique OTP for this errand.');
      code = randomInt(1000, 10000).toString();
    }
    const now = new Date();
    const log = repository.create({
      errandId: normalizedErrandId,
      otpCode: await argon2.hash(code, { type: argon2.argon2id }),
      encryptedOtp: this.encryptOtp(code),
      status: OTPStatus.GENERATED,
      attempts: 0,
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
      lastAttemptAt: null,
      lastFailureReason: null,
      verifiedAt: null,
      verifiedByCourierStudentId: null,
    });
    await repository.save(log);
    return code;
  }

  async getRecipientOtp(
    errandId: string,
    buyerStudentId: string,
  ): Promise<{ otpCode: string; expiresAt: Date }> {
    const order = await this.dataSource.getRepository(ErrandOrder).findOne({
      where: { id: errandId, buyerStudentId },
    });
    if (!order) throw new NotFoundException('Errand order not found');
    if (order.status !== ErrandOrderStatus.DELIVERING) {
      throw new BadRequestException('The errand is not currently being delivered.');
    }

    const log = await this.otpRepo.findOne({
      where: { errandId },
      order: { createdAt: 'DESC' },
    });
    if (!log || log.status !== OTPStatus.GENERATED) {
      throw new BadRequestException('No active OTP is available for this errand.');
    }
    if (!log.expiresAt || log.expiresAt.getTime() <= Date.now()) {
      log.status = OTPStatus.EXPIRED;
      log.lastFailureReason = 'EXPIRED_OTP';
      log.lastAttemptAt = new Date();
      await this.otpRepo.save(log);
      throw new BadRequestException('OTP code has expired.');
    }
    if (!log.encryptedOtp) {
      throw new BadRequestException('This OTP must be reissued through the authorized recovery process.');
    }

    return { otpCode: this.decryptOtp(log.encryptedOtp), expiresAt: log.expiresAt };
  }

  async reissueOtp(errandId: string, adminStudentId: string): Promise<{ expiresAt: Date }> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(ErrandOrder, {
        where: { id: errandId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('Errand order not found');
      if (order.status !== ErrandOrderStatus.DELIVERING) {
        throw new BadRequestException('An OTP can only be reissued for an errand in delivery.');
      }

      const currentLog = await manager.findOne(OTPLog, {
        where: { errandId },
        order: { createdAt: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });
      if (!currentLog) throw new BadRequestException('No previous OTP exists for this errand.');
      const resendAvailableAt = currentLog.createdAt.getTime() + 60 * 1000;
      if (resendAvailableAt > Date.now()) {
        throw new ConflictException('Please wait 60 seconds after OTP generation before requesting re-verification.');
      }
      if (
        currentLog.status === OTPStatus.GENERATED
        && currentLog.expiresAt
        && currentLog.expiresAt.getTime() > Date.now()
      ) {
        throw new ConflictException('The current OTP is still active.');
      }

      if (currentLog.status === OTPStatus.GENERATED) {
        currentLog.status = OTPStatus.EXPIRED;
        currentLog.lastFailureReason = 'EXPIRED_OTP';
        currentLog.lastAttemptAt = new Date();
        await manager.save(currentLog);
      }
      if (![OTPStatus.FAILED, OTPStatus.EXPIRED].includes(currentLog.status)) {
        throw new ConflictException('The current OTP does not require re-verification.');
      }

      await this.generateOtp(errandId, manager);
      const replacement = await manager.findOne(OTPLog, {
        where: { errandId },
        order: { createdAt: 'DESC' },
      });
      if (!replacement?.expiresAt) {
        throw new Error('Reissued OTP was not persisted.');
      }
      await this.recordAttempt(manager, errandId, currentLog.id, adminStudentId, 'AUTHORIZED_REISSUE');
      return { expiresAt: replacement.expiresAt };
    });
  }

  async verifyOtp(
    errandId: string,
    courierStudentId: string,
    otpCode: string,
  ): Promise<{ success: true; message: string; verifiedAt: Date; order: ErrandOrder }> {
    const normalizedOtpCode = (otpCode ?? '').trim();
    const outcome = await this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(ErrandOrder, {
        where: { id: errandId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) return { error: new NotFoundException('Errand order not found') };
      if (order.runnerStudentId !== courierStudentId) {
        await this.recordAttempt(manager, errandId, null, courierStudentId, 'UNAUTHORIZED_COURIER');
        return { error: new ForbiddenException('Only the courier assigned to this errand may verify its OTP.') };
      }
      if (order.status !== ErrandOrderStatus.DELIVERING) {
        if (order.status === ErrandOrderStatus.COMPLETED && order.handoffOtpLogId) {
          await this.recordAttempt(
            manager,
            errandId,
            order.handoffOtpLogId,
            courierStudentId,
            'HANDOFF_ALREADY_COMPLETED',
          );
          return { error: new ConflictException('This handoff has already been completed.') };
        }
        return { error: new BadRequestException('The errand is not currently being delivered.') };
      }

      const log = await manager.findOne(OTPLog, {
        where: { errandId },
        order: { createdAt: 'DESC' },
        lock: { mode: 'pessimistic_write' },
      });
      if (!log) {
        await this.recordAttempt(manager, errandId, null, courierStudentId, 'OTP_NOT_FOUND');
        return { error: new BadRequestException('No active OTP found for this errand.') };
      }

      if (log.status === OTPStatus.VERIFIED) {
        await this.recordAttempt(manager, errandId, log.id, courierStudentId, 'OTP_ALREADY_USED');
        return { error: new ConflictException('This OTP has already been used.') };
      }
      if (log.status !== OTPStatus.GENERATED) {
        await this.recordAttempt(manager, errandId, log.id, courierStudentId, 'OTP_NOT_ACTIVE');
        return { error: new BadRequestException('No active OTP found for this errand.') };
      }

      const now = new Date();
      if (!log.expiresAt || log.expiresAt.getTime() <= now.getTime()) {
        log.status = OTPStatus.EXPIRED;
        log.lastFailureReason = 'EXPIRED_OTP';
        log.lastAttemptAt = now;
        await manager.save(log);
        await this.recordAttempt(manager, errandId, log.id, courierStudentId, 'EXPIRED_OTP');
        return {
          error: new BadRequestException('OTP code has expired. Please request authorized re-verification.'),
        };
      }

      if (log.attempts >= MAX_FAILED_ATTEMPTS) {
        log.status = OTPStatus.FAILED;
        log.lastFailureReason = 'MAX_ATTEMPTS_REACHED';
        log.lastAttemptAt = now;
        await manager.save(log);
        await this.recordAttempt(manager, errandId, log.id, courierStudentId, 'MAX_ATTEMPTS_REACHED');
        return {
          error: new BadRequestException('Maximum OTP attempts reached. Authorized re-verification is required.'),
        };
      }

      if (!/^[0-9]{4}$/.test(normalizedOtpCode)) {
        log.attempts += 1;
        log.lastAttemptAt = now;
        log.lastFailureReason = 'INVALID_OTP_FORMAT';
        if (log.attempts >= MAX_FAILED_ATTEMPTS) log.status = OTPStatus.FAILED;
        await manager.save(log);
        await this.recordAttempt(manager, errandId, log.id, courierStudentId, 'INVALID_OTP_FORMAT');
        return { error: new BadRequestException('A valid 4-digit OTP is required.') };
      }

      const matches = await argon2.verify(log.otpCode, normalizedOtpCode);

      log.lastAttemptAt = now;
      if (!matches) {
        log.attempts += 1;
        log.lastFailureReason = 'INVALID_OTP';
        if (log.attempts >= MAX_FAILED_ATTEMPTS) log.status = OTPStatus.FAILED;
        await manager.save(log);
        await this.recordAttempt(manager, errandId, log.id, courierStudentId, 'INVALID_OTP');
        return {
          error: new BadRequestException(
            log.status === OTPStatus.FAILED
              ? 'Maximum OTP attempts reached. Authorized re-verification is required.'
              : `Invalid OTP code. Attempt ${log.attempts} of ${MAX_FAILED_ATTEMPTS}.`,
          ),
        };
      }

      log.status = OTPStatus.VERIFIED;
      log.lastFailureReason = null;
      log.verifiedAt = now;
      log.verifiedByCourierStudentId = courierStudentId;
      await manager.save(log);
      await this.recordAttempt(manager, errandId, log.id, courierStudentId, 'VERIFIED');

      order.status = ErrandOrderStatus.COMPLETED;
      order.handoffOtpLogId = log.id;
      order.completedAt = now;
      await manager.save(order);
      return {
        result: {
          success: true as const,
          message: 'OTP verified and delivery completed successfully.',
          verifiedAt: now,
          order,
        },
      };
    });
    if ('error' in outcome) throw outcome.error;
    return outcome.result;
  }

  private async recordAttempt(
    manager: EntityManager,
    errandId: string,
    otpLogId: string | null,
    actorStudentId: string,
    result: string,
  ): Promise<void> {
    await manager.getRepository(OTPAttempt).save({
      errandId,
      otpLogId,
      actorStudentId,
      result,
    });
  }

  private encryptionKey(): Buffer {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET must be configured with at least 32 characters to protect recipient OTPs.');
    }
    return createHash('sha256').update('msu-pakawit:otp-encryption:v1:').update(secret).digest();
  }

  private encryptOtp(code: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()]);
    return [iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
  }

  private decryptOtp(value: string): string {
    const [encodedIv, encodedTag, encodedCiphertext] = value.split('.');
    if (!encodedIv || !encodedTag || !encodedCiphertext) {
      throw new Error('Stored recipient OTP ciphertext is invalid.');
    }
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey(),
      Buffer.from(encodedIv, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }
}
