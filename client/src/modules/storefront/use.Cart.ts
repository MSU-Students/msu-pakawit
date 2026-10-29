import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ProductItem } from './types';

export interface CartLine {
  product: ProductItem;
  quantity: number;
}

const STORAGE_KEY = 'pakawit-cart';
export const MAX_QTY = 99;

// Binabasa yung naka-save na cart (product id -> quantity) pagka-refresh
const loadCart = (): Record<string, number> => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export function useCart(products: ProductItem[]) {
  const [quantities, setQuantities] = useState<Record<string, number>>(loadCart);

  // Auto-save tuwing may nagbago sa cart
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(quantities));
    } catch {
      /* kung hindi available ang storage, gagana pa rin ang cart sa memory */
    }
  }, [quantities]);

  // Kinukuha ang latest product info (price, availability) galing sa catalog
  const lines: CartLine[] = useMemo(
    () =>
      products
        .filter((p) => (quantities[p.id] ?? 0) > 0 && p.isActive !== false && p.isAvailable)
        .map((p) => ({ product: p, quantity: quantities[p.id] })),
    [products, quantities],
  );

  const addItem = useCallback((product: ProductItem) => {
    setQuantities((q) => ({
      ...q,
      [product.id]: Math.min((q[product.id] ?? 0) + 1, MAX_QTY),
    }));
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setQuantities((q) => {
      const next = { ...q };
      if (quantity <= 0) delete next[productId];
      else next[productId] = Math.min(quantity, MAX_QTY);
      return next;
    });
  }, []);

  const removeItem = useCallback((productId: string) => setQuantity(productId, 0), [setQuantity]);
  const clearCart = useCallback(() => setQuantities({}), []);

  const itemCount = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines]);

  return { lines, addItem, setQuantity, removeItem, clearCart, itemCount };
}
