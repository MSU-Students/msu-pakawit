import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from './entities/store.entity';
import { Product } from './entities/product.entity';
import { Order, OrderStatus } from './entities/order.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class StorefrontService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
  ) {}

  async createStore(dto: CreateStoreDto): Promise<Store> {
    const store = this.storeRepo.create(dto);
    return this.storeRepo.save(store);
  }

  async findAllStores(): Promise<Store[]> {
    return this.storeRepo.find({
      where: { isActive: true },
      relations: ['products'],
    });
  }

  async findStoreById(id: string): Promise<Store> {
    const store = await this.storeRepo.findOne({
      where: { id },
      relations: ['products'],
    });
    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }
    return store;
  }

  async addProductToStore(storeId: string, dto: CreateProductDto): Promise<Product> {
    const store = await this.findStoreById(storeId);
    
    // Calculate zero-capital markup price
    const markupPrice = Number(
      (dto.basePrice * (1 + Number(store.markupPercentage) / 100)).toFixed(2)
    );

    const product = this.productRepo.create({
      ...dto,
      storeId: store.id,
      markupPrice,
      isAvailable: true,
    });

    return this.productRepo.save(product);
  }

  async createOrder(storeId: string, dto: CreateOrderDto): Promise<Order> {
    const store = await this.findStoreById(storeId);

    const order = this.orderRepo.create({
      storeId: store.id,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      buyerStudentId: dto.buyerStudentId,
      deliveryAddress: dto.deliveryAddress,
      dropZone: dto.dropZone,
      deliveryNotes: dto.deliveryNotes,
      items: dto.items,
      totalProductCost: dto.totalProductCost,
      convenienceFee: dto.convenienceFee,
      totalAmount: dto.totalAmount,
      status: OrderStatus.PENDING,
    });

    return this.orderRepo.save(order);
  }

  async findOrdersByStore(storeId: string): Promise<Order[]> {
    await this.findStoreById(storeId);
    return this.orderRepo.find({
      where: { storeId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOrderById(id: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['store'],
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }
}
