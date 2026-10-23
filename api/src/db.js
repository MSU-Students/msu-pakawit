import Dexie from 'dexie';

// 1. Initialize the database instance with a name (e.g., 'CatalogDatabase')
export const db = new Dexie('CatalogDatabase');

// 2. Define the schema for your store
// 'id' is the primary key; 'name', 'category', and 'price' are indexed properties
db.version(1).stores({
  catalog: 'id, name, category, price'
});