import { db } from './db';
import { apiClient } from '../shared/apiClient';
import type { LocalProduct } from './types';

interface ServerProduct {
  id: string;
  storeId: string;
  name: string;
  category: string;
  basePrice: number | string;
  markupPrice: number | string;
  isAvailable: boolean;
  updatedAt?: string | number;
}

interface ServerStore {
  id: string;
  products?: ServerProduct[];
}

export class ProductRefreshService {
  private isRefreshing = false;
  private onlineListener: (() => void) | null = null;

  async refreshProducts(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return false;
    }

    if (this.isRefreshing) {
      return false;
    }

    this.isRefreshing = true;

    try {
      const response = await apiClient.get<ServerStore[]>('/stores');

      if (!response.success || !response.data) {
        return false;
      }

      const products: LocalProduct[] = response.data.flatMap((store) =>
        (store.products ?? []).map((product) => ({
          id: product.id,
          storeId: product.storeId || store.id,
          name: product.name,
          category: product.category,
          basePrice: Number(product.basePrice),
          markupPrice: Number(product.markupPrice),
          isAvailable: product.isAvailable,
          isSynced: true,
          updatedAt: product.updatedAt
            ? new Date(product.updatedAt).getTime()
            : Date.now(),
        }))
      );

      await db.transaction('rw', db.products, async () => {
        await db.products.bulkPut(products);
      });

      return true;
    } catch (error) {
      console.error('Failed to refresh product cache:', error);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  initAutoRefresh(
    onRefreshComplete?: (success: boolean) => void
  ): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.cleanup();

    this.onlineListener = () => {
      void this.refreshProducts().then((success) => {
        onRefreshComplete?.(success);
      });
    };

    window.addEventListener('online', this.onlineListener);

    // Refresh the catalog when the application starts online.
    if (navigator.onLine) {
      void this.refreshProducts().then((success) => {
        onRefreshComplete?.(success);
      });
    }
  }

  cleanup(): void {
    if (typeof window !== 'undefined' && this.onlineListener) {
      window.removeEventListener('online', this.onlineListener);
      this.onlineListener = null;
    }
  }
}

export const productRefreshService = new ProductRefreshService();