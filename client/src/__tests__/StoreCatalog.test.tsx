import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StoreCatalog } from '../modules/storefront/StoreCatalog';
import type { ProductItem, VirtualStore } from '../modules/storefront/types';

const store: VirtualStore = {
  id: 'store-1',
  name: 'Campus Store',
  hostName: 'Store Host',
  hostStudentId: '2023-00001',
  vendorOrigin: 'Commercial Center',
  defaultConvenienceFee: 35,
  markupPercentage: 10,
  rating: 5,
  isOpen: true,
};

const product: ProductItem = {
  id: 'product-1',
  storeId: store.id,
  name: 'Yellow Pad',
  category: 'School Supplies',
  basePrice: 50,
  markupPrice: 55,
  isAvailable: true,
};

describe('StoreCatalog order form', () => {
  it('requires customer and delivery details and submits them with selected products', async () => {
    const user = userEvent.setup();
    const onPlaceOrder = jest.fn();
    render(<StoreCatalog store={store} products={[product]} onPlaceOrder={onPlaceOrder} />);

    await user.click(screen.getByRole('button', { name: 'Add to Errand Cart' }));
    await user.click(screen.getByRole('button', { name: 'Place Errand Request (COD)' }));
    expect(onPlaceOrder).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Full name'), 'Ada Student');
    await user.type(screen.getByLabelText('Phone number'), '09171234567');
    await user.type(screen.getByLabelText('Delivery address details'), 'Science Complex, Room 204');
    await user.click(screen.getByRole('button', { name: 'Place Errand Request (COD)' }));

    expect(onPlaceOrder).toHaveBeenCalledWith({
      storeId: store.id,
      customerName: 'Ada Student',
      customerPhone: '09171234567',
      deliveryAddress: 'Science Complex, Room 204',
      dropZone: 'Science Complex Drop Hub',
      items: [{
        productId: product.id,
        name: product.name,
        quantity: 1,
        unitPrice: product.markupPrice,
      }],
      totalProductCost: 55,
      convenienceFee: 35,
      totalAmount: 90,
    });
    expect(screen.queryByText(product.name)).not.toBeInTheDocument();
  });
});
