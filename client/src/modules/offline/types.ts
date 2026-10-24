export type SyncAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface SyncQueueItem {
  id?: number;
  entityType: 'STORE' | 'PRODUCT' | 'ERRAND_ORDER' | 'SCHEDULE';
  entityId: string;
  action: SyncAction;
  payload: Record<string, any>;
  status: SyncStatus;
  retryCount: number;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

export interface LocalStore {
  id: string;
  hostStudentId: string;
  name: string;
  description?: string;
  vendorOrigin: string; // e.g., 'Commercial Center', 'MSU Main Gate', 'Cafeteria'
  defaultConvenienceFee: number; // in PHP
  markupPercentage: number;
  isActive: boolean;
  isSynced: boolean;
  updatedAt: number;
}

export interface LocalProduct {
  id: string;
  storeId: string;
  name: string;
  category: string;
  basePrice: number; // physical vendor price
  markupPrice: number; // calculated listed price
  isAvailable: boolean;
  isSynced: boolean;
  updatedAt: number;
}

export interface LocalErrandOrder {
  id: string;
  buyerStudentId: string;
  runnerStudentId?: string;
  storeId: string;
  items: Array<{ productId: string; name: string; quantity: number; unitPrice: number }>;
  totalProductCost: number;
  convenienceFee: number;
  totalAmount: number;
  dropZone: string; // e.g. 'Science Complex Hub', 'Kasadpan Hall', 'CNSM Lobby'
  status: 'PENDING' | 'ACCEPTED' | 'PURCHASED' | 'DELIVERING' | 'COMPLETED' | 'CANCELLED';
  otpCode?: string;
  isSynced: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface LocalAcademicSchedule {
  id: string;
  studentId: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  startTime: string; // '08:30'
  endTime: string;   // '10:00'
  courseCode: string; // 'CS101'
  room: string;
  isLocked: boolean; // active guardrail
}
