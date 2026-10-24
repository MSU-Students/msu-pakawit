import { cartReducer, getItemCount, MAX_QUANTITY } from '../modules/storefront/cartReducer';
import type { ProductItem } from '../modules/storefront/types';

const tea: ProductItem = {
  id: 'p1', storeId: 's1', name: 'Milk Tea', category: 'Drinks',
  basePrice: 50, markupPrice: 55, isAvailable: true,
};
const rice: ProductItem = { ...tea, id: 'p2', name: 'Rice Meal', basePrice: 70, markupPrice: 77 };

describe('cartReducer', () => {
  it('adds a new product with quantity 1', () => {
    expect(cartReducer([], { type: 'ADD', product: tea })).toEqual([{ product: tea, quantity: 1 }]);
  });

  it('increments quantity when the same product is added again', () => {
    const state = cartReducer([{ product: tea, quantity: 1 }], { type: 'ADD', product: tea });
    expect(state).toHaveLength(1);
    expect(state[0].quantity).toBe(2);
  });

  it('sets quantity and removes the line when quantity reaches 0', () => {
    const start = [{ product: tea, quantity: 2 }, { product: rice, quantity: 1 }];
    expect(cartReducer(start, { type: 'SET_QUANTITY', productId: 'p1', quantity: 5 })[0].quantity).toBe(5);
    expect(cartReducer(start, { type: 'SET_QUANTITY', productId: 'p1', quantity: 0 })).toHaveLength(1);
  });

  it('caps quantity at MAX_QUANTITY', () => {
    const state = cartReducer([{ product: tea, quantity: 1 }], {
      type: 'SET_QUANTITY', productId: 'p1', quantity: 1000,
    });
    expect(state[0].quantity).toBe(MAX_QUANTITY);
  });

  it('removes and clears', () => {
    const start = [{ product: tea, quantity: 2 }, { product: rice, quantity: 1 }];
    expect(cartReducer(start, { type: 'REMOVE', productId: 'p1' })).toHaveLength(1);
    expect(cartReducer(start, { type: 'CLEAR' })).toEqual([]);
  });

  it('counts total items', () => {
    expect(getItemCount([{ product: tea, quantity: 2 }, { product: rice, quantity: 3 }])).toBe(5);
  });
});