import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { OTPLog } from '../../guardrails/entities/otp-log.entity';

export enum ErrandOrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  PURCHASED = 'PURCHASED',
  DELIVERING = 'DELIVERING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('errand_orders')
export class ErrandOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  buyerStudentId: string;

  @Column({ nullable: true })
  runnerStudentId: string;

  @Column()
  storeId: string;

  @Column('jsonb', { default: [] })
  items: Array<{ productId: string; name: string; quantity: number; unitPrice: number }>;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalProductCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  convenienceFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column()
  dropZone: string;

  @Column({
    type: 'enum',
    enum: ErrandOrderStatus,
    default: ErrandOrderStatus.PENDING,
  })
  status: ErrandOrderStatus;

  @Column({ type: 'uuid', nullable: true })
  deliveryOtpLogId: string | null;

  @ManyToOne(() => OTPLog, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'deliveryOtpLogId' })
  deliveryOtpLog: OTPLog | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  deliveryCompletedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
