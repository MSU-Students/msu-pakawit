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
});
