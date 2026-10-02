import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StorefrontService } from '../modules/storefront/storefront.service';
import { Store } from '../modules/storefront/entities/store.entity';
import { Product } from '../modules/storefront/entities/product.entity';

describe('StorefrontService (Zero-Capital Cataloging & Markup)', () => {
  let service: StorefrontService;
  let mockStoreRepo: any;
  let mockProductRepo: any;

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
});
