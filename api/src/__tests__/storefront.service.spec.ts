import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StorefrontService } from '../modules/storefront/storefront.service';
import { Store } from '../modules/storefront/entities/store.entity';
import { Product } from '../modules/storefront/entities/product.entity';
import { User } from '../modules/users/entities/user.entity';
import { StoreCategory } from '../modules/storefront/entities/store-category.entity';

describe('StorefrontService (Zero-Capital Cataloging & Markup)', () => {
  let service: StorefrontService;
  let mockStoreRepo: any;
  let mockProductRepo: any;
  let mockCategoryRepo: any;

  beforeEach(async () => {
    mockStoreRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: 'store-1' })),
      find: jest.fn(),
      findOne: jest.fn(),
    };

    mockProductRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: 'prod-1' })),
      findOne: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    };
    mockCategoryRepo = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: 'category-1' })),
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorefrontService,
        {
          provide: getRepositoryToken(Store),
          useValue: mockStoreRepo,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepo,
        },
        {
          provide: getRepositoryToken(StoreCategory),
          useValue: mockCategoryRepo,
        },
      ],
    }).compile();

    service = module.get<StorefrontService>(StorefrontService);
  });

  it('should automatically compute marked-up product price based on store commission rate', async () => {
    const mockStore: Partial<Store> = {
      id: 'store-1',
      name: 'Amina Supplies',
      markupPercentage: 10,
      isActive: true,
      products: [],
    };

    mockStoreRepo.findOne.mockResolvedValue(mockStore);

    const product = await service.addProductToStore('store-1', {
      name: 'Yellow Pad Paper',
      category: 'Stationery',
      basePrice: 50.0,
    });

    // 50 + (10% of 50) = 55.0
    expect(product.markupPrice).toBe(55.0);
    expect(product.basePrice).toBe(50.0);
  });

  it('binds a new store to the authenticated owner instead of client-supplied identity', async () => {
    const owner = {
      id: 'user-1',
      msuIdNumber: '2023-01429',
      fullName: 'Amina Radiamoda',
    } as User;
    const storeData = {
      name: 'Amina Campus Supplies',
      vendorOrigin: 'Commercial Center',
      defaultConvenienceFee: 35,
      markupPercentage: 10,
    };

    await service.createStore(storeData, owner);

    expect(mockStoreRepo.create).toHaveBeenCalledWith({
      ...storeData,
      ownerId: owner.id,
      owner,
      hostStudentId: owner.msuIdNumber,
      hostName: owner.fullName,
    });
  });

  it('updates product availability without changing the product record identity', async () => {
    const product = { id: 'prod-1', storeId: 'store-1', isAvailable: true } as Product;
    mockProductRepo.findOne.mockResolvedValue(product);
    mockProductRepo.save.mockImplementation(async (entity) => entity);

    const updated = await service.setProductAvailability('store-1', 'prod-1', false);

    expect(updated.isAvailable).toBe(false);
    expect(mockProductRepo.findOne).toHaveBeenCalledWith({ where: { id: 'prod-1', storeId: 'store-1' } });
    expect(mockProductRepo.save).toHaveBeenCalledWith(product);
  });

  it('archives products by deactivating them rather than deleting them', async () => {
    const product = { id: 'prod-1', storeId: 'store-1', isActive: true } as Product;
    mockProductRepo.findOne.mockResolvedValue(product);
    mockProductRepo.save.mockImplementation(async (entity) => entity);

    const archived = await service.archiveProduct('store-1', 'prod-1');

    expect(archived.isActive).toBe(false);
    expect(mockProductRepo.save).toHaveBeenCalledWith(product);
    expect(mockProductRepo.remove).toBeUndefined();
  });
});
