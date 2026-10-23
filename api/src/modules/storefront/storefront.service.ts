import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Store } from './entities/store.entity';
import { Product } from './entities/product.entity';
import { CreateStoreDto } from './dto/create-store.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { User } from '../users/entities/user.entity';
import { UpdateProductDto } from './dto/update-product.dto';
import { StoreCategory } from './entities/store-category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class StorefrontService {
  constructor(
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(StoreCategory)
    private readonly categoryRepo: Repository<StoreCategory>,
  ) {}

  async createStore(dto: CreateStoreDto, owner: User): Promise<Store> {
    const store = this.storeRepo.create({
      ...dto,
      ownerId: owner.id,
      owner,
      hostStudentId: owner.msuIdNumber,
      hostName: owner.fullName,
    });
    return this.storeRepo.save(store);
  }

  async findAllStores(): Promise<Store[]> {
    const stores = await this.storeRepo.find({
      where: { isActive: true },
      relations: ['products'],
    });
    return stores.map((store) => ({
      ...store,
      products: store.products?.filter((product) => product.isActive) ?? [],
    }));
  }

  async findStoresForOwner(ownerId: string, hostStudentId: string, includeAll = false): Promise<Store[]> {
    const stores = await this.storeRepo.find({
      where: includeAll ? {} : [{ ownerId }, { hostStudentId }],
      relations: ['products', 'categories'],
    });
    return stores.map((store) => ({
      ...store,
      products: store.products ?? [],
    }));
  }

  async findCategories(storeId: string): Promise<StoreCategory[]> {
    const products = await this.productRepo.find({ where: { storeId }, select: ['category'] });
    const existing = await this.categoryRepo.find({ where: { storeId } });
    const existingNames = new Set(existing.map((category) => category.name.toLocaleLowerCase()));
    const legacyNames = [...new Set(products.map((product) => product.category.trim()).filter(Boolean))]
      .filter((name) => !existingNames.has(name.toLocaleLowerCase()));
    if (legacyNames.length) {
      await this.categoryRepo.save(legacyNames.map((name) => this.categoryRepo.create({ storeId, name })));
    }
    return this.categoryRepo.find({ where: { storeId }, order: { name: 'ASC' } });
  }

  async createCategory(storeId: string, dto: CreateCategoryDto): Promise<StoreCategory> {
    const name = dto.name.trim();
    const existing = await this.categoryRepo.findOne({ where: { storeId, name } });
    if (existing) throw new ConflictException('This category already exists');
    return this.categoryRepo.save(this.categoryRepo.create({ storeId, name }));
  }

  async renameCategory(storeId: string, categoryId: string, dto: CreateCategoryDto): Promise<StoreCategory> {
    const category = await this.findCategory(storeId, categoryId);
    const name = dto.name.trim();
    const duplicate = await this.categoryRepo.findOne({ where: { storeId, name } });
    if (duplicate && duplicate.id !== category.id) throw new ConflictException('This category already exists');
    await this.productRepo.update({ storeId, category: category.name }, { category: name });
    category.name = name;
    return this.categoryRepo.save(category);
  }

  async deleteCategory(storeId: string, categoryId: string): Promise<void> {
    const category = await this.findCategory(storeId, categoryId);
    const productCount = await this.productRepo.count({ where: { storeId, category: category.name } });
    if (productCount > 0) throw new ConflictException('Move all products in this category before deleting it');
    await this.categoryRepo.remove(category);
  }

  async findStoreById(id: string): Promise<Store> {
    const store = await this.storeRepo.findOne({
      where: { id },
      relations: ['products'],
    });
    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }
    store.products = store.products?.filter((product) => product.isActive) ?? [];
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
      description: dto.description ?? '',
      imageUrls: dto.imageUrls ?? [],
      storeId: store.id,
      markupPrice,
      isAvailable: true,
    });

    const savedProduct = await this.productRepo.save(product);
    const normalizedCategory = dto.category.trim();
    const category = await this.categoryRepo.findOne({ where: { storeId: store.id, name: normalizedCategory } });
    if (!category) {
      await this.categoryRepo.save(this.categoryRepo.create({ storeId: store.id, name: normalizedCategory }));
    }
    return savedProduct;
  }

  async updateProduct(storeId: string, productId: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findManagedProduct(storeId, productId);
    Object.assign(product, dto);
    if (dto.category !== undefined) {
      product.category = dto.category.trim();
      const category = await this.categoryRepo.findOne({ where: { storeId, name: product.category } });
      if (!category) {
        await this.categoryRepo.save(this.categoryRepo.create({ storeId, name: product.category }));
      }
    }
    if (dto.basePrice !== undefined) {
      const store = await this.findStoreById(storeId);
      product.markupPrice = Number((dto.basePrice * (1 + Number(store.markupPercentage) / 100)).toFixed(2));
    }
    return this.productRepo.save(product);
  }

  async setProductAvailability(storeId: string, productId: string, isAvailable: boolean): Promise<Product> {
    const product = await this.findManagedProduct(storeId, productId);
    product.isAvailable = isAvailable;
    return this.productRepo.save(product);
  }

  async archiveProduct(storeId: string, productId: string): Promise<Product> {
    const product = await this.findManagedProduct(storeId, productId);
    product.isActive = false;
    return this.productRepo.save(product);
  }

  async restoreProduct(storeId: string, productId: string): Promise<Product> {
    const product = await this.findManagedProduct(storeId, productId);
    product.isActive = true;
    return this.productRepo.save(product);
  }

  private async findManagedProduct(storeId: string, productId: string): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id: productId, storeId } });
    if (!product) throw new NotFoundException(`Product with ID ${productId} not found in store ${storeId}`);
    return product;
  }

  private async findCategory(storeId: string, categoryId: string): Promise<StoreCategory> {
    const category = await this.categoryRepo.findOne({ where: { id: categoryId, storeId } });
    if (!category) throw new NotFoundException(`Category with ID ${categoryId} not found in store ${storeId}`);
    return category;
  }
}
