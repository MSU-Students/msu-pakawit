import type { ApiResponse } from './types';

export class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;

  constructor(baseUrl?: string) {
    try {
      this.accessToken = sessionStorage.getItem('pakawitAccessToken');
    } catch {
      this.accessToken = null;
    }
    let envBaseUrl = '';
    try {
      envBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || '';
    } catch {
      envBaseUrl = '';
    }
    this.baseUrl = baseUrl || envBaseUrl || '/api';
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
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
      const data = response.status === 204 ? undefined : await response.json().catch(() => undefined);
      if (!response.ok) {
        const message = data?.message;
        throw new Error(Array.isArray(message) ? message.join(', ') : message || `HTTP ${response.status}: ${response.statusText}`);
      }
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'API request failed' };
    }
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, 'GET');
  }

  post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, 'POST', body);
  }

  patch<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, 'PATCH', body);
  }

  delete<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, 'DELETE', body);
  }
}

export const apiClient = new ApiClient();
