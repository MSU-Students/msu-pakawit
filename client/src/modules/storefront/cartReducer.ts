import type { ProductItem } from './types';

export interface CartLine {
  product: ProductItem;
  quantity: number;
}

export const MAX_QUANTITY = 99;

export type CartAction =
  | { type: 'ADD'; product: ProductItem }
  | { type: 'REMOVE'; productId: string }
  | { type: 'SET_QUANTITY'; productId: string; quantity: number }
  | { type: 'CLEAR' };

export function cartReducer(state: CartLine[], action: CartAction): CartLine[] {
  switch (action.type) {
    case 'ADD': {
      const existing = state.find((l) => l.product.id === action.product.id);
      if (existing) {
        return state.map((l) =>
          l.product.id === action.product.id
            ? { ...l, quantity: Math.min(l.quantity + 1, MAX_QUANTITY) }
            : l
        );
      }
      return [...state, { product: action.product, quantity: 1 }];
    }
    case 'REMOVE':
      return state.filter((l) => l.product.id !== action.productId);
    case 'SET_QUANTITY': {
      // Quantity of 0 or less removes the line
      if (action.quantity <= 0) {
        return state.filter((l) => l.product.id !== action.productId);
      }
      const quantity = Math.min(Math.floor(action.quantity), MAX_QUANTITY);
      return state.map((l) =>
        l.product.id === action.productId ? { ...l, quantity } : l
      );
    }
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

export const getItemCount = (cart: CartLine[]): number =>
  cart.reduce((sum, l) => sum + l.quantity, 0);