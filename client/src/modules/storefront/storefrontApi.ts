import { apiClient } from '../shared/apiClient';
import type { ApiResponse } from '../shared/types';
import type { ProductItem, VirtualStore } from './types';

export interface StoreCategory {
  id: string;
  storeId: string;
  name: string;
}

export interface ProductInput {
  name: string;
  description: string;
  imageUrls: string[];
  category: string;
  basePrice: number;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
  user: { id: string; username: string; fullName: string; role: string };
}

export interface StoreInput {
  name: string;
  description?: string;
  vendorOrigin: string;
  defaultConvenienceFee: number;
  markupPercentage: number;
}

const path = (storeId: string, suffix = '') => `/stores/${encodeURIComponent(storeId)}${suffix}`;

export const storefrontApi = {
  login: (username: string, password: string): Promise<ApiResponse<LoginResponse>> =>
    apiClient.post('/auth/login', { username, password }),
  listStores: (signal?: AbortSignal): Promise<ApiResponse<VirtualStore[]>> => apiClient.get('/stores', signal),
  getStore: (storeId: string, signal?: AbortSignal): Promise<ApiResponse<VirtualStore>> =>
    apiClient.get(path(storeId), signal),
  listMyStores: (): Promise<ApiResponse<VirtualStore[]>> => apiClient.get('/stores/mine'),
  createStore: (input: StoreInput): Promise<ApiResponse<VirtualStore>> => apiClient.post('/stores', input),
  listCategories: (storeId: string): Promise<ApiResponse<StoreCategory[]>> => apiClient.get(path(storeId, '/categories')),
  createCategory: (storeId: string, name: string): Promise<ApiResponse<StoreCategory>> =>
    apiClient.post(path(storeId, '/categories'), { name }),
  renameCategory: (storeId: string, categoryId: string, name: string): Promise<ApiResponse<StoreCategory>> =>
    apiClient.patch(path(storeId, `/categories/${encodeURIComponent(categoryId)}`), { name }),
  deleteCategory: (storeId: string, categoryId: string): Promise<ApiResponse<void>> =>
    apiClient.delete(path(storeId, `/categories/${encodeURIComponent(categoryId)}`)),
  createProduct: (storeId: string, input: ProductInput): Promise<ApiResponse<ProductItem>> =>
    apiClient.post(path(storeId, '/products'), input),
  updateProduct: (storeId: string, productId: string, input: ProductInput): Promise<ApiResponse<ProductItem>> =>
    apiClient.patch(path(storeId, `/products/${encodeURIComponent(productId)}`), input),
  setAvailability: (storeId: string, productId: string, isAvailable: boolean): Promise<ApiResponse<ProductItem>> =>
    apiClient.patch(path(storeId, `/products/${encodeURIComponent(productId)}/availability`), { isAvailable }),
  archiveProduct: (storeId: string, productId: string): Promise<ApiResponse<ProductItem>> =>
    apiClient.patch(path(storeId, `/products/${encodeURIComponent(productId)}/archive`), {}),
  restoreProduct: (storeId: string, productId: string): Promise<ApiResponse<ProductItem>> =>
    apiClient.patch(path(storeId, `/products/${encodeURIComponent(productId)}/restore`), {}),
};