import { db } from '../offline/db';
import { syncEngine } from '../offline/syncEngine';
import type { Order } from './orderTypes';

/**
 * Saves a new order locally and queues it for sync in one transaction,
 * so an order can never exist without its outbox entry.
 */
export async function placeOrder(
  order: Order,
  buyerStudentId: string,
  syncNow = false,
): Promise<void> {
  const createdAt = Date.parse(order.createdAt);

  await db.transaction('rw', db.orders, db.syncQueue, async () => {
    await db.orders.put({
      id: order.id,
      buyerStudentId,
      storeId: order.storeId,
      items: order.items,
      totalProductCost: order.totalProductCost,
      convenienceFee: order.convenienceFee,
      totalAmount: order.totalAmount,
      dropZone: order.deliveryAddress,
      buyerName: order.buyerName,
      contactNumber: order.contactNumber,
      deliveryAddress: order.deliveryAddress,
      status: 'PENDING',
      otpCode: '7429', // TODO: placeholder as in App.tsx; real OTP belongs to Team 4
      isSynced: false, // only true once the server confirms
      createdAt,
      updatedAt: createdAt,
    });

    await db.queueSync({
      entityType: 'ERRAND_ORDER',
      entityId: order.id,
      action: 'CREATE',
      payload: order,
    });
  });

  if (syncNow) void syncEngine.triggerSync();
}