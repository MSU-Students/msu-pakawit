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

  it('saves and retrieves profile images by local profile ID', async () => {
    const image = 'data:image/png;base64,cHJvZmlsZQ==';

    await testDb.saveProfileImage(image, 'local-demo-profile');

    await expect(testDb.getProfileImage('local-demo-profile')).resolves.toBe(image);
    await expect(testDb.getProfileImage('another-local-profile')).resolves.toBeNull();

    await testDb.deleteProfileImage('local-demo-profile');

    await expect(testDb.getProfileImage('local-demo-profile')).resolves.toBeNull();
  });

  it('saves and restores cart items and the selected drop zone', async () => {
    const items = [{
      product: {
        id: 'product-1',
        storeId: 'store-1',
        name: 'Notebook',
        category: 'School Supplies',
        description: 'A ruled notebook.',
        basePrice: 100,
        markupPrice: 110,
        isAvailable: true,
      },
      quantity: 2,
    }];

    await testDb.saveCart(items, 'CNSM Main Lobby');

    await expect(testDb.getSavedCart()).resolves.toMatchObject({
      id: 'active-cart',
      items,
      selectedDropZone: 'CNSM Main Lobby',
    });
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
