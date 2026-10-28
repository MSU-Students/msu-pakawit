
import Dexie, { type Table } from 'dexie';
import type { CartItem } from '../storefront/types';
import type {
  LocalStore,
  LocalProduct,
  LocalErrandOrder,
  LocalAcademicSchedule,
  SyncQueueItem,
} from './types';

export interface LocalProfileImage {
  id: string;
  image: string;
  updatedAt: number;
}

export interface LocalSavedCart {
  id: 'active-cart';
  items: CartItem[];
  selectedDropZone: string;
  updatedAt: number;
}

export class MSUPakawitDatabase extends Dexie {
  stores!: Table<LocalStore, string>;
  products!: Table<LocalProduct, string>;
  orders!: Table<LocalErrandOrder, string>;
  academicSchedules!: Table<LocalAcademicSchedule, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  profileImages!: Table<LocalProfileImage, string>;
  savedCarts!: Table<LocalSavedCart, string>;

  constructor(databaseName: string = 'MSUPakawitOfflineDB') {
    super(databaseName);

    this.version(1).stores({
      stores: 'id, hostStudentId, vendorOrigin, isActive, isSynced, updatedAt',
      products: 'id, storeId, category, isAvailable, isSynced, updatedAt',
      orders: 'id, buyerStudentId, runnerStudentId, storeId, status, isSynced, createdAt',
      academicSchedules: 'id, studentId, dayOfWeek, courseCode, isLocked',
      syncQueue: '++id, entityType, entityId, action, status, createdAt',
    });

    // Version 2: Add profile image storage.
    this.version(2).stores({
      stores: 'id, hostStudentId, vendorOrigin, isActive, isSynced, updatedAt',
      products: 'id, storeId, category, isAvailable, isSynced, updatedAt',
      orders: 'id, buyerStudentId, runnerStudentId, storeId, status, isSynced, createdAt',
      academicSchedules: 'id, studentId, dayOfWeek, courseCode, isLocked',
      syncQueue: '++id, entityType, entityId, action, status, createdAt',
      profileImages: 'id, updatedAt',
    });

    this.version(3).stores({
      stores: 'id, hostStudentId, vendorOrigin, isActive, isSynced, updatedAt',
      products: 'id, storeId, category, isAvailable, isSynced, updatedAt',
      orders: 'id, buyerStudentId, runnerStudentId, storeId, status, isSynced, createdAt',
      academicSchedules: 'id, studentId, dayOfWeek, courseCode, isLocked',
      syncQueue: '++id, entityType, entityId, action, status, createdAt',
      profileImages: 'id, updatedAt',
      savedCarts: 'id',
    });
  }

  async getSavedCart(): Promise<LocalSavedCart | undefined> {
    return await this.savedCarts.get('active-cart');
  }

  async saveCart(items: CartItem[], selectedDropZone: string): Promise<void> {
    await this.savedCarts.put({
      id: 'active-cart',
      items,
      selectedDropZone,
      updatedAt: Date.now(),
    });
  }

  async saveProfileImage(image: string, userId: string) {
    await this.profileImages.put({
      id: userId,
      image,
      updatedAt: Date.now(),
    });
  }

  async getProfileImage(userId: string): Promise<string | null> {
    const profile = await this.profileImages.get(userId);
    return profile?.image ?? null;
  }

  async deleteProfileImage(userId: string): Promise<void> {
    await this.profileImages.delete(userId);
  }

  async queueSync(
    item: Omit<
      SyncQueueItem,
      'id' | 'retryCount' | 'createdAt' | 'updatedAt' | 'status'
    >
  ) {
    const now = Date.now();

    return await this.syncQueue.add({
      ...item,
      status: 'PENDING',
      retryCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  async getPendingSyncItems() {
    return await this.syncQueue
      .where('status')
      .equals('PENDING')
      .toArray();
  }
}

export const db = new MSUPakawitDatabase();
