import { useCallback, useEffect, useRef, useState } from 'react';
import { productRepository } from './productRepository';
import { storefrontApi } from '../storefront/storefrontApi';
import type { ProductItem, VirtualStore } from '../storefront/types';

const CATALOG_REQUEST_TIMEOUT_MS = 15_000;

export type CatalogSource = 'server' | 'cache' | 'none';
export type CatalogStatus = 'loading' | 'fresh' | 'cached' | 'empty-cache';

export interface CatalogState {
  store: VirtualStore | null;
  products: ProductItem[];
  isOnline: boolean;
  isRefreshing: boolean;
  status: CatalogStatus;
  source: CatalogSource;
  lastSyncAt: number | null;
  error: string | null;
  refresh: (storeId?: string) => Promise<void>;
}

export const useCatalog = (forceOffline = false): CatalogState => {
  const [networkOnline, setNetworkOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine,
  );
  const isOnline = networkOnline && !forceOffline;
  const [store, setStore] = useState<VirtualStore | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [status, setStatus] = useState<CatalogStatus>('loading');
  const [source, setSource] = useState<CatalogSource>('none');
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const activeController = useRef<AbortController | null>(null);

  useEffect(() => {
    const handleOnline = () => setNetworkOnline(true);
    const handleOffline = () => setNetworkOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => () => activeController.current?.abort(), []);

  const refresh = useCallback(async (storeId?: string) => {
    const currentRequestId = ++requestId.current;
    activeController.current?.abort();
    activeController.current = null;
    setIsRefreshing(true);
    setError(null);

    let cached: Awaited<ReturnType<typeof productRepository.getCachedCatalog>> = {
      store: null,
      products: [],
      lastSyncAt: null,
    };
    let cacheError: string | null = null;
    try {
      cached = await productRepository.getCachedCatalog(storeId);
    } catch (cause) {
      cacheError = cause instanceof Error ? cause.message : 'Could not read the local catalog cache.';
    }

    if (requestId.current !== currentRequestId) return;
    setLastSyncAt(cached.lastSyncAt);
    if (cached.store) {
      setStore(cached.store);
      setProducts(cached.products);
      setSource('cache');
      setStatus('cached');
    } else {
      setStore(null);
      setProducts([]);
      setSource('none');
      setStatus('empty-cache');
    }
    if (cacheError) setError(`Could not read the local catalog cache: ${cacheError}`);

    if (!isOnline) {
      if (!cached.store) setStatus('empty-cache');
      setIsRefreshing(false);
      return;
    }

    try {
      const controller = new AbortController();
      activeController.current = controller;
      const timeoutId = window.setTimeout(
        () => controller.abort(new Error('Catalog request timed out.')),
        CATALOG_REQUEST_TIMEOUT_MS,
      );
      let response: Awaited<ReturnType<typeof storefrontApi.listStores>>
        | Awaited<ReturnType<typeof storefrontApi.getStore>>;
      try {
        response = storeId
          ? await storefrontApi.getStore(storeId, controller.signal)
          : await storefrontApi.listStores(controller.signal);
      } finally {
        window.clearTimeout(timeoutId);
        if (activeController.current === controller) activeController.current = null;
      }
      if (!response.success || !response.data) {
        throw new Error(response.error || 'The catalog server returned no data.');
      }

      const responseStores = Array.isArray(response.data) ? response.data : [response.data];
      const stores = responseStores.map((candidate) => ({
        ...candidate,
        defaultConvenienceFee: Number(candidate.defaultConvenienceFee),
        markupPercentage: Number(candidate.markupPercentage),
        products: (candidate.products ?? []).map((product) => ({
          ...product,
          basePrice: Number(product.basePrice),
          markupPrice: Number(product.markupPrice),
        })),
      }));
      const freshStore = stores.find((candidate) => candidate.id === storeId) ?? stores[0] ?? null;
      if (requestId.current !== currentRequestId) return;
      setStore(freshStore);
      setProducts(freshStore?.products ?? []);
      setSource('server');
      setStatus('fresh');
      setError(cacheError ? `Catalog loaded, but the local cache could not be read: ${cacheError}` : null);

      try {
        await productRepository.saveCatalog(stores, { replaceAll: !storeId });
        const syncedAt = await productRepository.getLastSyncTime();
        if (requestId.current === currentRequestId) {
          setLastSyncAt(syncedAt);
          setError(null);
        }
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Could not save the refreshed catalog locally.';
        if (requestId.current === currentRequestId) {
          setError(`Catalog loaded, but could not save it to the local cache: ${message}`);
        }
      }
    } catch (cause) {
      if (requestId.current !== currentRequestId) return;
      const message = cause instanceof Error ? cause.message : 'Could not refresh the catalog.';
      setError(cacheError ? `Could not read the local catalog cache: ${cacheError}. ${message}` : message);
      if (cached.store) {
        setStore(cached.store);
        setProducts(cached.products);
        setSource('cache');
        setStatus('cached');
      } else {
        setStore(null);
        setProducts([]);
        setSource('none');
        setStatus('empty-cache');
      }
    } finally {
      if (requestId.current === currentRequestId) setIsRefreshing(false);
    }
  }, [isOnline]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    store,
    products,
    isOnline,
    isRefreshing,
    status,
    source,
    lastSyncAt,
    error,
    refresh,
  };
};
