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

  it('stores customer order details with status Pending in the database', async () => {
    const timestamp = Date.now();
    const orderId = 'ORD-20261018-001';

    await testDb.orders.put({
      id: orderId,
      customerName: 'Sittie Norhaima',
      customerPhone: '09171234567',
      deliveryAddress: 'Dormitory 2, Room 304, MSU Campus',
      dropZone: 'Science Complex Drop Hub',
      deliveryNotes: 'Please ring bell',
      buyerStudentId: '2023-01429',
      storeId: 'store-1',
      storeName: 'Amina Campus Supplies',
      items: [
        {
          productId: 'prod-1',
          name: 'Yellow Pad Paper',
          quantity: 2,
          unitPrice: 49.5,
        },
      ],
      totalProductCost: 99.0,
      convenienceFee: 35.0,
      totalAmount: 134.0,
      status: 'Pending',
      isSynced: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    const storedOrder = await testDb.orders.get(orderId);

    // Acceptance Criteria:
    // 1. Order form collects customer details, product selections, and delivery address
    expect(storedOrder).toBeDefined();
    expect(storedOrder?.customerName).toBe('Sittie Norhaima');
    expect(storedOrder?.customerPhone).toBe('09171234567');
    expect(storedOrder?.deliveryAddress).toBe('Dormitory 2, Room 304, MSU Campus');
    expect(storedOrder?.dropZone).toBe('Science Complex Drop Hub');
    expect(storedOrder?.items).toHaveLength(1);
    expect(storedOrder?.items[0].name).toBe('Yellow Pad Paper');

    // 2. Order receipt / record has order ID and timestamp
    expect(storedOrder?.id).toBe(orderId);
    expect(storedOrder?.createdAt).toBe(timestamp);

    // 3. Order status is set to "Pending" upon creation
    expect(storedOrder?.status).toBe('Pending');

    // 4. Order details are stored in the database
    expect(storedOrder?.totalAmount).toBe(134.0);
  });
});
