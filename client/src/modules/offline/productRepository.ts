import { db, type MSUPakawitDatabase } from './db';
import type { LocalProduct, LocalStore, SyncMetadata } from './types';
import type { ProductItem, VirtualStore } from '../storefront/types';

export interface ProductFilters {
  storeId?: string;
  category?: string;
}

export interface CachedCatalog {
  store: VirtualStore | null;
  products: ProductItem[];
  lastSyncAt: number | null;
}

export interface SaveCatalogOptions {
  replaceAll?: boolean;
}

const timestamp = (value?: string | number | Date): number => {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? Date.now() : parsed;
  }
  return typeof value === 'number' && Number.isFinite(value) ? value : Date.now();
};

const toLocalProduct = (product: ProductItem, syncedAt: number): LocalProduct => ({
  id: product.id,
  storeId: product.storeId,
  name: product.name,
  description: product.description ?? '',
  imageUrls: product.imageUrls ?? [],
  category: product.category,
  basePrice: Number(product.basePrice),
  markupPrice: Number(product.markupPrice),
  isAvailable: product.isAvailable,
  isActive: product.isActive !== false,
  isSynced: true,
  updatedAt: timestamp(product.updatedAt),
  syncedAt,
});

const toLocalStore = (store: VirtualStore, syncedAt: number): LocalStore => ({
  id: store.id,
  hostStudentId: store.hostStudentId,
  hostName: store.hostName,
  name: store.name,
  description: store.description,
  vendorOrigin: store.vendorOrigin,
  defaultConvenienceFee: Number(store.defaultConvenienceFee),
  markupPercentage: Number(store.markupPercentage),
  isActive: store.isActive !== false,
  isSynced: true,
  updatedAt: timestamp(store.updatedAt),
  syncedAt,
});

const toProductItem = (product: LocalProduct): ProductItem => ({
  id: product.id,
  storeId: product.storeId,
  name: product.name,
  description: product.description,
  imageUrls: product.imageUrls,
  category: product.category,
  basePrice: product.basePrice,
  markupPrice: product.markupPrice,
  isAvailable: product.isAvailable,
  isActive: product.isActive,
  updatedAt: product.updatedAt,
  syncedAt: product.syncedAt,
});

const toVirtualStore = (store: LocalStore): VirtualStore => ({
  id: store.id,
  name: store.name,
  description: store.description,
  hostName: store.hostName ?? '',
  hostStudentId: store.hostStudentId,
  vendorOrigin: store.vendorOrigin,
  defaultConvenienceFee: store.defaultConvenienceFee,
  markupPercentage: store.markupPercentage,
  isActive: store.isActive,
  updatedAt: store.updatedAt,
  syncedAt: store.syncedAt,
});

export class ProductRepository {
  constructor(private readonly database: MSUPakawitDatabase = db) {}

  async saveProducts(products: ProductItem[]): Promise<void> {
    const syncedAt = Date.now();
    await this.database.transaction('rw', [this.database.products, this.database.syncMetadata], async () => {
      await this.database.products.bulkPut(products.map((product) => toLocalProduct(product, syncedAt)));
      await this.writeLastSyncTime(syncedAt);
    });
  }

  async saveCatalog(stores: VirtualStore[], options: SaveCatalogOptions = {}): Promise<void> {
    const syncedAt = Date.now();
    await this.database.transaction('rw', [this.database.stores, this.database.products, this.database.syncMetadata], async () => {
      if (options.replaceAll) {
        await this.database.stores.clear();
        await this.database.products.clear();
      }
      for (const store of stores) {
        await this.database.stores.put(toLocalStore(store, syncedAt));
        await this.database.products.where('storeId').equals(store.id).delete();
        const products = (store.products ?? []).map((product) =>
          toLocalProduct({ ...product, storeId: store.id }, syncedAt),
        );
        if (products.length > 0) await this.database.products.bulkPut(products);
      }
      await this.writeLastSyncTime(syncedAt);
    });
  }

  async getCachedProducts(filters: ProductFilters = {}): Promise<ProductItem[]> {
    let products: LocalProduct[];
    if (filters.storeId) {
      products = await this.database.products.where('storeId').equals(filters.storeId).toArray();
    } else if (filters.category) {
      products = await this.database.products.where('category').equals(filters.category).toArray();
    } else {
      products = await this.database.products.toArray();
    }

    if (filters.category && filters.storeId) {
      products = products.filter((product) => product.category === filters.category);
    }
    return products.map(toProductItem);
  }

  async getCachedStores(): Promise<VirtualStore[]> {
    const stores = await this.database.stores.orderBy('updatedAt').reverse().toArray();
    return stores.map(toVirtualStore);
  }

  async getCachedCatalog(storeId?: string): Promise<CachedCatalog> {
    const [stores, lastSyncAt] = await Promise.all([
      this.database.stores.toArray(),
      this.getLastSyncTime(),
    ]);
    const cachedStore = (storeId
      ? stores.find((store) => store.id === storeId)
      : stores.sort((a, b) => b.updatedAt - a.updatedAt)[0]) ?? null;
    if (!cachedStore) return { store: null, products: [], lastSyncAt };

    const products = await this.getCachedProducts({ storeId: cachedStore.id });
    return {
      store: toVirtualStore(cachedStore),
      products,
      lastSyncAt,
    };
  }

  async getLastSyncTime(): Promise<number | null> {
    const metadata = await this.database.syncMetadata.get('catalog-last-sync');
    return metadata?.value ?? null;
  }

  async clearCache(): Promise<void> {
    await this.database.transaction('rw', [this.database.stores, this.database.products, this.database.syncMetadata], async () => {
      await this.database.stores.clear();
      await this.database.products.clear();
      await this.database.syncMetadata.clear();
    });
  }

  private async writeLastSyncTime(syncedAt: number): Promise<void> {
    const metadata: SyncMetadata = { key: 'catalog-last-sync', value: syncedAt };
    await this.database.syncMetadata.put(metadata);
  }
}

export const productRepository = new ProductRepository();
