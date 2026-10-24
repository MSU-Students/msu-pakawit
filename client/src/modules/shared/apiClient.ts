import { getAccessToken } from './authSession';
import type { ApiResponse } from './types';

const readViteApiBaseUrl = (): string => {
  return typeof __API_BASE_URL__ !== 'undefined'
    ? __API_BASE_URL__
    : '';
};

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || readViteApiBaseUrl() || '/api';
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, body: any): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  async patch<T>(path: string, body: any): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: this.buildHeaders(init.headers),
      });
      if (!response.ok) {
        let detail = response.statusText;
        try {
          const errorBody = await response.json();
          const message = errorBody?.message;
          if (Array.isArray(message) && message.length > 0) detail = message.join(' ');
          else if (typeof message === 'string' && message.trim()) detail = message;
        } catch {
          // Keep the HTTP status text when the body is not JSON.
        }
        throw new Error(`HTTP ${response.status}: ${detail}`);
      }
      const data = await response.json();
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'API request failed' };
    }
  }

  private buildHeaders(initHeaders?: HeadersInit): Headers {
    const headers = new Headers(initHeaders);
    const token = getAccessToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }
}

export const apiClient = new ApiClient();
