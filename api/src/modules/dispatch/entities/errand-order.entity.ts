import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Store } from '../../storefront/entities/store.entity';
import { User } from '../../users/entities/user.entity';
import { ErrandOrderItem } from './errand-order-item.entity';

export enum ErrandOrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  PURCHASED = 'PURCHASED',
  DELIVERING = 'DELIVERING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('errand_orders')
@Index('IDX_errand_orders_status_createdAt', ['status', 'createdAt'])
@Index('IDX_errand_orders_storeUuid_createdAt', ['storeUuid', 'createdAt'])
@Index('IDX_errand_orders_customerUserId_createdAt', ['customerUserId', 'createdAt'])
@Index('UQ_errand_orders_idempotencyKey', ['idempotencyKey'], { unique: true })
export class ErrandOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  buyerStudentId: string;

  @Column({ nullable: true })
  runnerStudentId: string;

  @Column()
  storeId: string;

  @Column({ type: 'uuid', nullable: true })
  storeUuid: string | null;

  @ManyToOne(() => Store, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'storeUuid' })
  store: Store | null;

  @Column({ type: 'uuid', nullable: true })
  customerUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customerUserId' })
  customerUser: User | null;

  @Column({ type: 'varchar', length: 160, nullable: true })
  customerName: string | null;

  @Column({ type: 'varchar', length: 254, nullable: true })
  customerEmail: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  customerPhone: string | null;

  @Column({ type: 'text', nullable: true })
  deliveryAddress: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  idempotencyKey: string | null;

  @Column('jsonb', { default: [] })
  items: Array<{ productId: string; name: string; quantity: number; unitPrice: number }>;

  @OneToMany(() => ErrandOrderItem, (item) => item.order)
  lineItems: ErrandOrderItem[];

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
