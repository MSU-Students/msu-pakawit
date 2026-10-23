import { MSUPakawitDatabase } from '../modules/offline/db';
import { ProductRepository } from '../modules/offline/productRepository';
import type { VirtualStore } from '../modules/storefront/types';

describe('ProductRepository', () => {
  let database: MSUPakawitDatabase;
  let repository: ProductRepository;

  beforeEach(async () => {
    database = new MSUPakawitDatabase(`catalog-test-${Math.random()}`);
    await database.open();
    repository = new ProductRepository(database);
  });

  afterEach(async () => {
    if (database.isOpen()) await database.delete();
  });

  it('persists storefronts and products for offline catalog access', async () => {
    const store: VirtualStore = {
      id: 'store-1',
      name: 'Campus Corner',
      hostName: 'Student Host',
      hostStudentId: '2023-01001',
      vendorOrigin: 'Commercial Center',
      defaultConvenienceFee: 30,
      markupPercentage: 10,
      products: [{
        id: 'product-1',
        storeId: 'store-1',
        name: 'Yellow Pad',
        description: '80 leaves',
        imageUrls: [],
        category: 'Supplies',
        basePrice: 45,
        markupPrice: 49.5,
        isAvailable: true,
        isActive: true,
        updatedAt: '2026-10-18T10:00:00.000Z',
      }],
    };

    await repository.saveCatalog([store]);

    const cached = await repository.getCachedCatalog('store-1');
    expect(cached.store?.name).toBe('Campus Corner');
    expect(cached.products).toEqual([expect.objectContaining({
      id: 'product-1',
      name: 'Yellow Pad',
      basePrice: 45,
      markupPrice: 49.5,
    })]);
    expect(cached.lastSyncAt).toEqual(expect.any(Number));
    expect(await repository.getLastSyncTime()).toBe(cached.lastSyncAt);
  });

  it('filters cached products and clears catalog data and sync metadata', async () => {
    await repository.saveProducts([
      {
        id: 'product-1',
        storeId: 'store-1',
        name: 'Yellow Pad',
        description: '',
        imageUrls: [],
        category: 'Supplies',
        basePrice: 45,
        markupPrice: 49.5,
        isAvailable: true,
        isActive: true,
      },
      {
        id: 'product-2',
        storeId: 'store-2',
        name: 'Pater',
        description: '',
        imageUrls: [],
        category: 'Food',
        basePrice: 50,
        markupPrice: 55,
        isAvailable: true,
        isActive: true,
      },
    ]);

    expect(await repository.getCachedProducts({ storeId: 'store-1' })).toHaveLength(1);
    expect(await repository.getCachedProducts({ category: 'Food' })).toHaveLength(1);
    await repository.clearCache();
    expect(await repository.getCachedProducts()).toEqual([]);
    expect(await repository.getLastSyncTime()).toBeNull();
  });

  it('replaces the full cache on a complete catalog refresh, including empty results', async () => {
    await repository.saveCatalog([{
      id: 'store-1',
      name: 'Campus Corner',
      hostName: 'Student Host',
      hostStudentId: '2023-01001',
      vendorOrigin: 'Commercial Center',
      defaultConvenienceFee: 30,
      markupPercentage: 10,
      products: [],
    }]);

    await repository.saveCatalog([], { replaceAll: true });

    expect(await repository.getCachedStores()).toEqual([]);
    expect(await repository.getCachedProducts()).toEqual([]);
    expect(await repository.getLastSyncTime()).not.toBeNull();
  });
});
