import Dexie, { type Table } from 'dexie';
import type {
  LocalStore,
  LocalProduct,
  LocalErrandOrder,
  LocalAcademicSchedule,
  SyncQueueItem,
} from './types';

export class MSUPakawitDatabase extends Dexie {
  stores!: Table<LocalStore, string>;
  products!: Table<LocalProduct, string>;
  orders!: Table<LocalErrandOrder, string>;
  academicSchedules!: Table<LocalAcademicSchedule, string>;
  syncQueue!: Table<SyncQueueItem, number>;

  constructor(databaseName: string = 'MSUPakawitOfflineDB') {
    super(databaseName);

    this.version(1).stores({
      stores: 'id, hostStudentId, vendorOrigin, isActive, isSynced, updatedAt',
      products: 'id, storeId, category, isAvailable, isSynced, updatedAt',
      orders: 'id, buyerStudentId, runnerStudentId, storeId, status, isSynced, createdAt',
      academicSchedules: 'id, studentId, dayOfWeek, courseCode, isLocked',
      syncQueue: '++id, entityType, entityId, action, status, createdAt',
    });
  }

  /**
   * Helper to queue an outbox mutation for background sync
   */
  async queueSync(item: Omit<SyncQueueItem, 'id' | 'retryCount' | 'createdAt' | 'updatedAt' | 'status'>) {
    const now = Date.now();
    return await this.syncQueue.add({
      ...item,
      status: 'PENDING',
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Helper to get pending sync items
   */
  async getPendingSyncItems() {
    return await this.syncQueue.where('status').equals('PENDING').toArray();
  }
}

export const db = new MSUPakawitDatabase();
