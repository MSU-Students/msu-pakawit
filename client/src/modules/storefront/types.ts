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
