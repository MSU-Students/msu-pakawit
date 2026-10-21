import { ErrandOrder, ErrandOrderStatus } from '../entities/errand-order.entity';

export interface OrderReceipt {
  receiptNumber: string;
  orderId: string;
  issuedAt: string; // ISO 8601 timestamp
  status: ErrandOrderStatus;
  customer: {
    studentId: string;
    name: string | null;
    contactNumber: string | null;
  };
  storeId: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  totalProductCost: number;
  convenienceFee: number;
  totalAmount: number;
  deliveryAddress: string;
}

export function buildReceipt(order: ErrandOrder): OrderReceipt {
  return {
    // Derived from the order ID, so it is stable and needs no extra column.
    receiptNumber: `PKW-${order.id.slice(0, 8).toUpperCase()}`,
    orderId: order.id,
    issuedAt: order.createdAt.toISOString(),
    status: order.status,
    customer: {
      studentId: order.buyerStudentId,
      name: order.customerName ?? null,
      contactNumber: order.contactNumber ?? null,
    },
    storeId: order.storeId,
    items: order.items.map((item) => ({
      ...item,
      lineTotal: Math.round(item.quantity * item.unitPrice * 100) / 100,
    })),
    // Postgres returns decimal columns as strings, so convert them.
    totalProductCost: Number(order.totalProductCost),
    convenienceFee: Number(order.convenienceFee),
    totalAmount: Number(order.totalAmount),
    deliveryAddress: order.dropZone,
  };
}