export type ErrandStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'PURCHASED'
  | 'DELIVERING'
  | 'COMPLETED'
  | 'CANCELLED';

export interface ErrandTask {
  id: string;
  storeName: string;
  vendorOrigin: string;
  dropZone: string;
  itemCount: number;
  totalAmount: number;
  convenienceFee: number;
  status: ErrandStatus;
  buyerName: string;
  runnerName?: string;
  createdAt: number;
}

export interface ErrandOrderRequest {
  buyerStudentId: string;
  storeId: string;
  items: Array<{ productId: string; name: string; quantity: number; unitPrice: number }>;
  totalProductCost: number;
  convenienceFee: number;
  totalAmount: number;
  dropZone: string;
}

export interface ErrandOrderReceipt {
  orderId: string;
  timestamp: string;
}
