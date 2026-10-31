import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CheckoutDto } from './dto/checkout.dto';
import { Order, OrderStatus } from './entities/order.entity';

// Galing sa frontend (₱35.00). Palitan kung iba ang rule ng team.
const CONVENIENCE_FEE = 35;

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
  ) {}

  async checkout(dto: CheckoutDto) {
    const subtotal = dto.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    const order = this.orderRepo.create({
      customerName: dto.customerName,
      contactNumber: dto.contactNumber,
      deliveryAddress: dto.deliveryAddress,
      status: OrderStatus.PENDING,
      subtotal,
      convenienceFee: CONVENIENCE_FEE,
      total: subtotal + CONVENIENCE_FEE,
      items: dto.items,
    });

    const saved = await this.orderRepo.save(order);
    return this.toReceipt(saved);
  }

  async findOne(id: string) {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    return this.toReceipt(order);
  }

  private toReceipt(order: Order) {
    return {
      orderId: order.id,
      createdAt: order.createdAt,
      status: order.status,
      customerName: order.customerName,
      contactNumber: order.contactNumber,
      deliveryAddress: order.deliveryAddress,
      items: order.items.map((i) => ({
        productId: i.productId,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      subtotal: order.subtotal,
      convenienceFee: order.convenienceFee,
      total: order.total,
    };
  }
}