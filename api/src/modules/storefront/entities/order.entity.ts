import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Store } from './store.entity';

export enum OrderStatus {
  PENDING = 'Pending',
  ACCEPTED = 'Accepted',
  PROCESSING = 'Processing',
  DELIVERING = 'Delivering',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
}

export interface OrderItemRecord {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  storeId: string;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store: Store;

  @Column()
  customerName: string;

  @Column()
  customerPhone: string;

  @Column({ nullable: true })
  buyerStudentId?: string;

  @Column()
  deliveryAddress: string;

  @Column()
  dropZone: string;

  @Column({ nullable: true })
  deliveryNotes?: string;

  @Column('jsonb', { default: [] })
  items: OrderItemRecord[];

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalProductCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  convenienceFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({
    type: 'varchar',
    length: 50,
    default: OrderStatus.PENDING,
  })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
