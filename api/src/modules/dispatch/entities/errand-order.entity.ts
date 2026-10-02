import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
