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
    try {
      const response = await fetch(`${this.baseUrl}${path}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message || 'API request failed' };
    }
  }

  async post<T>(path: string, body: any): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
}

export const apiClient = new ApiClient();
