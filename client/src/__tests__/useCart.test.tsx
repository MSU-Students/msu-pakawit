import { renderHook, act } from '@testing-library/react';
import { useCart } from '../modules/storefront/useCart';
import type { ProductItem } from '../modules/storefront/types';

const tea: ProductItem = {
  id: 'p1', storeId: 's1', name: 'Milk Tea', category: 'Drinks',
  basePrice: 50, markupPrice: 55, isAvailable: true,
};

describe('useCart persistence', () => {
  beforeEach(() => sessionStorage.clear());

  it('restores the cart after a remount (simulated refresh)', () => {
    const first = renderHook(() => useCart('s1'));
    act(() => first.result.current.addItem(tea));
    act(() => first.result.current.setQuantity('p1', 3));
    first.unmount();

    const second = renderHook(() => useCart('s1'));
    expect(second.result.current.cart).toHaveLength(1);
    expect(second.result.current.cart[0].quantity).toBe(3);
  });

  it('starts empty when stored data is corrupted', () => {
    sessionStorage.setItem('pakawit_cart_s1', '{not valid json');
    const { result } = renderHook(() => useCart('s1'));
    expect(result.current.cart).toEqual([]);
  });
});