export interface ProductItem {
  id: string;
  storeId: string;
  name: string;
  description: string;
  imageUrls: string[];
  category: string;
  basePrice: number;
  markupPrice: number;
  isAvailable: boolean;
  isActive: boolean;
  updatedAt?: string | number | Date;
  syncedAt?: number;
}

export interface VirtualStore {
  id: string;
  name: string;
  hostName: string;
  hostStudentId: string;
  vendorOrigin: string;
  defaultConvenienceFee: number;
  markupPercentage: number;
  rating?: number;
  isOpen?: boolean;
  isActive?: boolean;
  description?: string;
  updatedAt?: string | number | Date;
  syncedAt?: number;
  products?: ProductItem[];
}

export interface PricingBreakdown {
  basePrice: number;
  markupPercentage: number;
  markupAmount: number;
  subtotal: number;
  convenienceFee: number;
  grandTotal: number;
}
