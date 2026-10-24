import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../storefront/entities/product.entity';
import type { ErrandOrder } from './errand-order.entity';

@Entity('errand_order_items')
@Index('IDX_errand_order_items_orderId', ['orderId'])
@Index('IDX_errand_order_items_productId', ['productId'])
@Check('CHK_errand_order_items_quantity_positive', '"quantity" > 0')
@Check('CHK_errand_order_items_unitPrice_nonnegative', '"unitPrice" >= 0')
@Check('CHK_errand_order_items_productName_nonempty', 'length(btrim("productName")) > 0')
export class ErrandOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  orderId: string;

  @ManyToOne('ErrandOrder', (order: ErrandOrder) => order.lineItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: ErrandOrder;

  @Column({ type: 'uuid', nullable: true })
  productId: string | null;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  product: Product | null;

  @Column({ type: 'text' })
  productName: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;
}
