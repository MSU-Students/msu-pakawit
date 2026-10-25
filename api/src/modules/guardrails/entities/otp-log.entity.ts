import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum OTPStatus {
  GENERATED = 'GENERATED',
  VERIFIED = 'VERIFIED',
  EXPIRED = 'EXPIRED',
  FAILED = 'FAILED',
}

@Entity('otp_logs')
export class OTPLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  errandId: string;

  @Column({ type: 'varchar', length: 255 })
  otpCode: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  encryptedOtp: string;

  @Column({
    type: 'enum',
    enum: OTPStatus,
    default: OTPStatus.GENERATED,
  })
  status: OTPStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastAttemptAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  lastFailureReason: string | null;

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  verifiedByCourierStudentId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
