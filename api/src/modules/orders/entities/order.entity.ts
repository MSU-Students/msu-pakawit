import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

const decimal = {
  to: (v: number) => v,
  from: (v: string) => parseFloat(v),
};

@Entity('customer_orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  customerName: string;

  @Column({ nullable: true })
  contactNumber?: string;

  @Column()
  deliveryAddress: string;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column('numeric', { precision: 10, scale: 2, transformer: decimal })
  subtotal: number;

  @Column('numeric', { precision: 10, scale: 2, transformer: decimal })
  convenienceFee: number;

  @Column('numeric', { precision: 10, scale: 2, transformer: decimal })
  total: number;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true, eager: true })
  items: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;
}