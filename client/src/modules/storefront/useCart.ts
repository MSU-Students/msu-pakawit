import { useCallback, useEffect, useReducer } from 'react';
import { cartReducer } from './cartReducer';
import type { CartLine } from './cartReducer';
import type { ProductItem } from './types';

const storageKey = (storeId: string) => `pakawit_cart_${storeId}`;

function isCartLine(value: unknown): value is CartLine {
  const line = value as CartLine;
  return (
    !!line &&
    typeof line.quantity === 'number' &&
    line.quantity > 0 &&
    !!line.product &&
    typeof line.product.id === 'string' &&
    typeof line.product.markupPrice === 'number' &&
    typeof line.product.basePrice === 'number'
  );
}

export function loadCart(storeId: string): CartLine[] {
  try {
    const raw = sessionStorage.getItem(storageKey(storeId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isCartLine) : [];
  } catch {
    return []; // storage blocked or corrupted JSON
  }
}

export function useCart(storeId: string) {
  const [cart, dispatch] = useReducer(cartReducer, storeId, loadCart);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey(storeId), JSON.stringify(cart));
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [cart, storeId]);

  const addItem = useCallback(
    (product: ProductItem) => dispatch({ type: 'ADD', product }),
    []
  );
  const removeItem = useCallback(
    (productId: string) => dispatch({ type: 'REMOVE', productId }),
    []
  );
  const setQuantity = useCallback(
    (productId: string, quantity: number) =>
      dispatch({ type: 'SET_QUANTITY', productId, quantity }),
    []
  );
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  return { cart, addItem, removeItem, setQuantity, clearCart };
}