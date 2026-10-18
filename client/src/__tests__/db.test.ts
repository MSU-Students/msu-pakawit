import Dexie from 'dexie';
import { MSUPakawitDatabase } from '../modules/offline/db';

describe('Dexie.js Offline Database & Outbox Queue', () => {
  let testDb: MSUPakawitDatabase;

  beforeEach(async () => {
    testDb = new MSUPakawitDatabase(`test-db-${Math.random()}`);
    await testDb.open();
  });

  afterEach(async () => {
    if (testDb.isOpen()) {
      await testDb.delete();
    }
  });

  it('stores and retrieves virtual store entities', async () => {
    await testDb.stores.put({
      id: 'store-1',
      hostStudentId: '2023-01001',
      name: 'Campus Corner',
      vendorOrigin: 'Commercial Center',
      defaultConvenienceFee: 30,
      markupPercentage: 10,
      isActive: true,
      isSynced: true,
      updatedAt: Date.now(),
      syncedAt: Date.now(),
    });

    const store = await testDb.stores.get('store-1');
    expect(store).toBeDefined();
    expect(store?.name).toBe('Campus Corner');
  });

  it('queues outbox mutation items for offline sync', async () => {
    await testDb.queueSync({
      entityType: 'STORE',
      entityId: 'store-1',
      action: 'CREATE',
      payload: { name: 'Campus Corner' },
    });

    const pending = await testDb.getPendingSyncItems();
    expect(pending.length).toBe(1);
    expect(pending[0].entityType).toBe('STORE');
    expect(pending[0].status).toBe('PENDING');
  });

  it('upgrades v1 catalog records for offline storefront use', async () => {
    const databaseName = `legacy-db-${Math.random()}`;
    const legacyDb = new Dexie(databaseName);
    legacyDb.version(1).stores({
      stores: 'id, hostStudentId, vendorOrigin, isActive, isSynced, updatedAt',
      products: 'id, storeId, category, isAvailable, isSynced, updatedAt',
      orders: 'id, buyerStudentId, runnerStudentId, storeId, status, isSynced, createdAt',
      academicSchedules: 'id, studentId, dayOfWeek, courseCode, isLocked',
      syncQueue: '++id, entityType, entityId, action, status, createdAt',
    });
    await legacyDb.open();
    await legacyDb.table('stores').put({
      id: 'store-legacy',
      hostStudentId: '2023-01001',
      name: 'Campus Corner',
      vendorOrigin: 'Commercial Center',
      defaultConvenienceFee: 30,
      markupPercentage: 10,
      isActive: true,
      isSynced: true,
      updatedAt: 100,
    });
    await legacyDb.table('products').put({
      id: 'product-legacy',
      storeId: 'store-legacy',
      name: 'Yellow Pad',
      category: 'Supplies',
      basePrice: 45,
      markupPrice: 49.5,
      isAvailable: true,
      isSynced: true,
      updatedAt: 100,
    });
    await legacyDb.close();

    const migratedDb = new MSUPakawitDatabase(databaseName);
    await migratedDb.open();
    const product = await migratedDb.products.get('product-legacy');
    expect(product).toMatchObject({
      description: '',
      imageUrls: [],
      isActive: true,
      syncedAt: expect.any(Number),
    });
    await migratedDb.delete();
  });
});
