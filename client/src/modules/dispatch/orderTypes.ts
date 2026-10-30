import type { ErrandStatus } from './types';

export interface OrderProduct {
  id: string;
  name: string;
  price: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface Order {
  id: string;
  createdAt: string; // ISO timestamp
  status: ErrandStatus; // always 'PENDING' on creation
  storeId: string;
  storeName: string;
  buyerName: string;
  contactNumber: string;
  deliveryAddress: string;
  items: OrderItem[];
  totalProductCost: number;
  convenienceFee: number;
  totalAmount: number; // totalProductCost + convenienceFee
}

export interface OrderFormValues {
  buyerName: string;
  contactNumber: string;
  deliveryAddress: string;
  quantities: Record<string, number>; // productId -> quantity
}

export type OrderFormErrors = Partial<
  Record<'buyerName' | 'contactNumber' | 'deliveryAddress' | 'items', string>
>;