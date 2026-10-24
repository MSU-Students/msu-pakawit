import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OTPLog } from './otp-log.entity';

export enum OTPAttemptResult {
  INVALID = 'INVALID_OTP',
  EXPIRED = 'EXPIRED_OTP',
  ALREADY_USED = 'ALREADY_USED',
  MAX_ATTEMPTS_REACHED = 'MAX_ATTEMPTS_REACHED',
  VERIFIED = 'VERIFIED',
}

@Entity('otp_attempts')
export class OTPAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  errandId: string;

  @ManyToOne(() => OTPLog)
  @JoinColumn({ name: 'otpLogId' })
  otpLog: OTPLog;

  @Column({ type: 'varchar', length: 50 })
  result: OTPAttemptResult;

  @CreateDateColumn({ type: 'timestamp' })
  attemptedAt: Date;
}
