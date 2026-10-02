import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
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

  @Column({ length: 4 })
  otpCode: string;

  @Column({
    type: 'enum',
    enum: OTPStatus,
    default: OTPStatus.GENERATED,
  })
  status: OTPStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
