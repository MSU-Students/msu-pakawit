import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum OTPAttemptResult {
  INVALID = 'INVALID',
  EXPIRED = 'EXPIRED',
  LOCKED = 'LOCKED',
  VERIFIED = 'VERIFIED',
}

@Entity('otp_attempt_logs')
export class OTPAttemptLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  otpLogId: string;

  @Column()
  errandId: string;

  @Column({ type: 'uuid' })
  attemptedByUserId: string;

  @Column({ type: 'int' })
  attemptNumber: number;

  @Column({ type: 'enum', enum: OTPAttemptResult })
  result: OTPAttemptResult;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  attemptedAt: Date;
}
