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
