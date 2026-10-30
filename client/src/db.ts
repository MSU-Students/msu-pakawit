import Dexie, { Table } from 'dexie';

export interface Product {
  id: string;
  name: string;
  price: number;
  category?: string;
  stock?: number;
  [key: string]: any;
}

export interface StorefrontRecord {
  id: string;
  name: string;
  status?: string;
  [key: string]: any;
}

export class AppDatabase extends Dexie {
  products!: Table<Product>;
  storefronts!: Table<StorefrontRecord>;

  constructor() {
    super('PakawitOfflineDB');
    this.version(1).stores({
      products: 'id, name, category',
      storefronts: 'id, name'
    });
  }
}

export const db = new AppDatabase();