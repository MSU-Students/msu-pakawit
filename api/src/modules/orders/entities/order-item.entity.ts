import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Order } from './order.entity';

const decimal = {
  to: (v: number) => v,
  from: (v: string) => parseFloat(v),
};

@Entity('customer_order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @Column()
  name: string;

  @Column('int')
  quantity: number;

  @Column('numeric', { precision: 10, scale: 2, transformer: decimal })
  unitPrice: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  order: Order;
}