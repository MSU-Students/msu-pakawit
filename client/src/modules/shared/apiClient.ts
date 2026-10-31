import type { ApiResponse } from './types';

export interface AuthenticatedApiClient {
  readonly hasAccessToken: boolean;
  setAccessToken(token: string | null): void;
  get<T>(path: string): Promise<ApiResponse<T>>;
  post<T>(path: string, body: unknown): Promise<ApiResponse<T>>;
  patch<T>(path: string, body: unknown): Promise<ApiResponse<T>>;
}

export class ApiClient implements AuthenticatedApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl?: string) {
    let envBaseUrl = '';
    try {
      envBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || '';
    } catch {
      envBaseUrl = '';
    }
    this.baseUrl = baseUrl || envBaseUrl || '/api';
  }

  async get<T>(path: string, accessToken?: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'API request failed' };
    }
  }
  get hasAccessToken(): boolean {
    return this.accessToken !== null;
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, 'GET');
  }

  async post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, 'POST', body);
  }

  async patch<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, 'PATCH', body);
  }

  private async request<T>(path: string, method: string, body?: unknown): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {};
      if (body !== undefined) headers['Content-Type'] = 'application/json';
      if (this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API request failed',
      };
    }
  }
}

export const apiClient = new ApiClient();
