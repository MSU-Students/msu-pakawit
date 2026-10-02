import { db } from './db';

export class SyncEngine {
  private isSyncing = false;
  private onlineListener: (() => void) | null = null;
  private apiEndpoint = '/api/sync/batch';

  constructor(customApiUrl?: string) {
    if (customApiUrl) {
      this.apiEndpoint = `${customApiUrl}/sync/batch`;
    }
  }

  /**
   * Initialize network online listener to auto-sync when connection restores
   */
  initAutoSync(onSyncComplete?: (results: { successful: number; failed: number }) => void) {
    if (typeof window !== 'undefined') {
      this.onlineListener = async () => {
        if (navigator.onLine) {
          const res = await this.triggerSync();
          onSyncComplete?.(res);
        }
      };
      window.addEventListener('online', this.onlineListener);
    }
  }

  /**
   * Trigger processing of all pending outbox queue items
   */
  async triggerSync(): Promise<{ successful: number; failed: number }> {
    if (this.isSyncing) return { successful: 0, failed: 0 };
    this.isSyncing = true;

    let successful = 0;
    let failed = 0;

    try {
      const pendingItems = await db.getPendingSyncItems();
      if (pendingItems.length === 0) {
        this.isSyncing = false;
        return { successful: 0, failed: 0 };
      }

      // Mark all as SYNCING
      for (const item of pendingItems) {
        if (item.id) {
          await db.syncQueue.update(item.id, { status: 'SYNCING', updatedAt: Date.now() });
        }
      }

      // Send to API batch endpoint
      try {
        const response = await fetch(this.apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch: pendingItems }),
        });

        if (response.ok) {
          await response.json();
          // Mark completed
          for (const item of pendingItems) {
            if (item.id) {
              await db.syncQueue.update(item.id, { status: 'SYNCED', updatedAt: Date.now() });
              successful++;
            }
          }
        } else {
          throw new Error(`Sync API responded with status ${response.status}`);
        }
      } catch (err: any) {
        // Handle failure - mark back to PENDING or increment retry
        for (const item of pendingItems) {
          if (item.id) {
            await db.syncQueue.update(item.id, {
              status: 'FAILED',
              retryCount: item.retryCount + 1,
              errorMessage: err?.message || 'Network error during sync',
              updatedAt: Date.now(),
            });
            failed++;
          }
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return { successful, failed };
  }

  cleanup() {
    if (typeof window !== 'undefined' && this.onlineListener) {
      window.removeEventListener('online', this.onlineListener);
    }
  }
}

export const syncEngine = new SyncEngine();
