import type { ApiResponse } from './types';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    let envBaseUrl = '';
    try {
      envBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL || '';
    } catch {
      envBaseUrl = '';
    }
    this.baseUrl = baseUrl || envBaseUrl || '/api';
  }

  async get<T>(path: string): Promise<ApiResponse<T>> {
    return this.request<T>(path);
  }

  async post<T>(path: string, body: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private async request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, init);
      const data = await response.json() as {
        message?: string | string[];
        code?: string;
      } & T;
      if (!response.ok) {
        const message = Array.isArray(data.message)
          ? data.message.join(', ')
          : data.message ?? `HTTP ${response.status}: ${response.statusText}`;
        return { success: false, error: message, code: data.code };
      }
      return { success: true, data };
    } catch (error: unknown) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API request failed',
      };
    }
  }
}

export const apiClient = new ApiClient();
