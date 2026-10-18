import { act, renderHook, waitFor } from '@testing-library/react';
import { productRepository, type CachedCatalog } from '../modules/offline/productRepository';
import { useCatalog } from '../modules/offline/useCatalog';
import { storefrontApi } from '../modules/storefront/storefrontApi';
import type { VirtualStore } from '../modules/storefront/types';

jest.mock('../modules/offline/productRepository', () => ({
  productRepository: {
    getCachedCatalog: jest.fn(),
    saveCatalog: jest.fn(),
    getLastSyncTime: jest.fn(),
  },
}));

jest.mock('../modules/storefront/storefrontApi', () => ({
  storefrontApi: {
    getStore: jest.fn(),
    listStores: jest.fn(),
  },
}));

const store: VirtualStore = {
  id: 'store-1',
  name: 'Campus Corner',
  hostName: 'Student Host',
  hostStudentId: '2023-01001',
  vendorOrigin: 'Commercial Center',
  defaultConvenienceFee: 30,
  markupPercentage: 10,
  products: [],
};

const emptyCache: CachedCatalog = { store: null, products: [], lastSyncAt: null };
const cachedCatalog: CachedCatalog = { store, products: [], lastSyncAt: 123 };
const repository = jest.mocked(productRepository);
const api = jest.mocked(storefrontApi);

describe('useCatalog', () => {
  let originalOnLine: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    jest.clearAllMocks();
    repository.getCachedCatalog.mockResolvedValue(emptyCache);
    repository.saveCatalog.mockResolvedValue();
    repository.getLastSyncTime.mockResolvedValue(456);
    api.listStores.mockResolvedValue({ success: true, data: [store] });
  });

  afterEach(() => {
    if (originalOnLine) {
      Object.defineProperty(navigator, 'onLine', originalOnLine);
    } else {
      Reflect.deleteProperty(navigator, 'onLine');
    }
  });

  it('refreshes from the server and persists the returned catalog', async () => {
    const { result } = renderHook(() => useCatalog());

    await waitFor(() => expect(result.current.status).toBe('fresh'));
    expect(result.current.source).toBe('server');
    expect(repository.saveCatalog).toHaveBeenCalledWith([store], { replaceAll: true });
    expect(result.current.lastSyncAt).toBe(456);

    await act(async () => result.current.refresh());
    expect(api.listStores).toHaveBeenCalledTimes(2);
  });

  it('serves cached catalog data while offline', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    repository.getCachedCatalog.mockResolvedValue(cachedCatalog);

    const { result } = renderHook(() => useCatalog());

    await waitFor(() => expect(result.current.status).toBe('cached'));
    expect(result.current.store).toEqual(store);
    expect(result.current.isOnline).toBe(false);
    expect(api.listStores).not.toHaveBeenCalled();
  });

  it('updates network state from browser online/offline events', async () => {
    repository.getCachedCatalog.mockResolvedValue(cachedCatalog);
    const { result } = renderHook(() => useCatalog());
    await waitFor(() => expect(result.current.status).toBe('fresh'));

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    act(() => window.dispatchEvent(new Event('offline')));

    await waitFor(() => expect(result.current.isOnline).toBe(false));
    expect(result.current.source).toBe('cache');
    expect(api.listStores).toHaveBeenCalledTimes(1);
  });

  it('falls back to cached data when the online request fails', async () => {
    repository.getCachedCatalog.mockResolvedValue(cachedCatalog);
    api.listStores.mockResolvedValue({ success: false, error: 'Network unavailable' });

    const { result } = renderHook(() => useCatalog());

    await waitFor(() => expect(result.current.status).toBe('cached'));
    expect(result.current.source).toBe('cache');
    expect(result.current.error).toBe('Network unavailable');
  });

  it('falls back to cached data when the catalog request times out', async () => {
    jest.useFakeTimers();
    repository.getCachedCatalog.mockResolvedValue(cachedCatalog);
    api.listStores.mockImplementation((signal) => new Promise((resolve) => {
      signal?.addEventListener('abort', () => resolve({
        success: false,
        error: signal.reason instanceof Error ? signal.reason.message : 'Request aborted',
      }));
    }));

    const { result } = renderHook(() => useCatalog());

    await act(async () => {
      await jest.advanceTimersByTimeAsync(15_000);
    });

    expect(result.current.status).toBe('cached');
    expect(result.current.error).toBe('Catalog request timed out.');
    jest.useRealTimers();
  });

  it('reports an explicit empty-cache state when offline without cached data', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });

    const { result } = renderHook(() => useCatalog());

    await waitFor(() => expect(result.current.status).toBe('empty-cache'));
    expect(result.current.store).toBeNull();
    expect(result.current.source).toBe('none');
  });
});
