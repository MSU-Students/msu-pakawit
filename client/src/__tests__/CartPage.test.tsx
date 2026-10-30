import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CartPage } from '../modules/storefront/CartPage';
import type { CartItem, VirtualStore } from '../modules/storefront/types';

const store: VirtualStore = {
  id: 'store-1',
  name: 'Campus Store',
  hostName: 'Amina',
  hostStudentId: '2023-01429',
  vendorOrigin: 'Commercial Center',
  defaultConvenienceFee: 35,
  markupPercentage: 10,
  rating: 4.9,
  isOpen: true,
};

const cart: CartItem[] = [
  {
    product: {
      id: 'product-1',
      storeId: store.id,
      name: 'Notebook',
      category: 'School Supplies',
      description: 'A ruled notebook for class notes.',
      basePrice: 100,
      markupPrice: 110,
      isAvailable: true,
    },
    quantity: 1,
  },
];

const renderCart = (onPlaceOrder = jest.fn().mockResolvedValue(undefined)) => {
  const props = {
    store,
    cart,
    selectedDropZone: 'Science Complex Drop Hub',
    onDropZoneChange: jest.fn(),
    onUpdateQuantity: jest.fn(),
    onRemoveItem: jest.fn(),
    onContinueShopping: jest.fn(),
    onPlaceOrder,
  };
  return { ...render(<CartPage {...props} />), props };
};

describe('CartPage', () => {
  it('shows product details and exposes quantity and remove controls', () => {
    const { props } = renderCart();

    expect(screen.getByText('A ruled notebook for class notes.')).toBeInTheDocument();
    expect(screen.getByText('₱110.00', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('₱110.00', { selector: 'p' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Increase Notebook quantity' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Notebook from cart' }));

    expect(props.onUpdateQuantity).toHaveBeenCalledWith('product-1', 2);
    expect(props.onRemoveItem).toHaveBeenCalledWith('product-1');
  });

  it('submits the cart with the selected drop zone and calculated totals', async () => {
    const { props } = renderCart();

    fireEvent.click(screen.getByRole('button', { name: 'Place Errand Request (COD)' }));

    await waitFor(() => {
      expect(props.onPlaceOrder).toHaveBeenCalledWith({
        storeId: 'store-1',
        dropZone: 'Science Complex Drop Hub',
        items: [{ productId: 'product-1', name: 'Notebook', quantity: 1, unitPrice: 110 }],
        totalProductCost: 110,
        convenienceFee: 35,
        totalAmount: 145,
      });
    });
  });
});
