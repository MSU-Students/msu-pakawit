import { apiClient } from '../shared/apiClient';
import type { ApiResponse } from '../shared/types';

export interface NotificationPreferences {
  statusChanges: boolean;
  assignments: boolean;
}

export interface VapidPublicKey {
  publicKey: string;
}

export const notificationsApi = {
  getVapidPublicKey: (): Promise<ApiResponse<VapidPublicKey>> =>
    apiClient.get('/notifications/vapid-public-key'),
  getPreferences: (): Promise<ApiResponse<NotificationPreferences>> =>
    apiClient.get('/notifications/preferences'),
  updatePreferences: (preferences: Partial<NotificationPreferences>): Promise<ApiResponse<NotificationPreferences>> =>
    apiClient.patch('/notifications/preferences', preferences),
  subscribe: (subscription: PushSubscriptionJSON): Promise<ApiResponse<{ success: boolean }>> =>
    apiClient.post('/notifications/subscriptions', subscription),
  unsubscribe: (endpoint: string): Promise<ApiResponse<{ success: boolean }>> =>
    apiClient.delete('/notifications/subscriptions', { endpoint }),
};
