export interface ProductItem {
  id: string;
  storeId: string;
  name: string;
  category: string;
  basePrice: number;
  markupPrice: number;
  isAvailable: boolean;
}

export interface VirtualStore {
  id: string;
  name: string;
  hostName: string;
  hostStudentId: string;
  vendorOrigin: string;
  defaultConvenienceFee: number;
  markupPercentage: number;
  rating: number;
  isOpen: boolean;
}

export interface PricingBreakdown {
  basePrice: number;
  markupPercentage: number;
  markupAmount: number;
  subtotal: number;
  convenienceFee: number;
  grandTotal: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderFormData {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  dropZone: string;
  buyerStudentId?: string;
  deliveryNotes?: string;
}

export interface OrderReceiptData {
  id: string;
  storeId: string;
  storeName: string;
  vendorOrigin: string;
  hostName?: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  dropZone: string;
  buyerStudentId?: string;
  deliveryNotes?: string;
  items: OrderItem[];
  totalProductCost: number;
  convenienceFee: number;
  totalAmount: number;
  status: 'Pending' | string;
  createdAt: number | string;
}
