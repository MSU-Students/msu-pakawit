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

  @Column({ length: 64, select: false })
  otpHash: string;

  @Column({
    type: 'enum',
    enum: OTPStatus,
    default: OTPStatus.GENERATED,
  })
  status: OTPStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'timestamp with time zone' })
  expiresAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  verifiedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  verifiedByUserId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
