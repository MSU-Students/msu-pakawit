import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from './entities/store.entity';
import { Product } from './entities/product.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class StorefrontService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
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
}
