import { render, screen, fireEvent } from '@testing-library/react';
import { OrderFormModal } from '../modules/storefront/OrderFormModal';
import type { VirtualStore, ProductItem } from '../modules/storefront/types';

describe('OrderFormModal Component', () => {
  const mockStore: VirtualStore = {
    id: 'store-1',
    name: "Amina's Campus Supplies",
    hostName: 'Amina Radiamoda',
    hostStudentId: '2023-01429',
    vendorOrigin: 'Commercial Center',
    defaultConvenienceFee: 35.0,
    markupPercentage: 10,
    rating: 4.9,
    isOpen: true,
  };

  const mockCart: Array<{ product: ProductItem; quantity: number }> = [
    {
      product: {
        id: 'prod-1',
        storeId: 'store-1',
        name: 'Yellow Pad Paper (80 leaves)',
        category: 'School Supplies',
        basePrice: 45.0,
        markupPrice: 49.5,
        isAvailable: true,
      },
      quantity: 2,
    },
    {
      product: {
        id: 'prod-2',
        storeId: 'store-1',
        name: 'Pilot G2 Gel Pen 0.5 Black',
        category: 'School Supplies',
        basePrice: 65.0,
        markupPrice: 71.5,
        isAvailable: true,
      },
      quantity: 1,
    },
  ];

  const mockOnUpdateQuantity = jest.fn();
  const mockOnRemoveItem = jest.fn();
  const mockOnSubmit = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders order form collecting customer details, product selections, and delivery address', () => {
    render(
      <OrderFormModal
        store={mockStore}
        cart={mockCart}
        onUpdateQuantity={mockOnUpdateQuantity}
        onRemoveItem={mockOnRemoveItem}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    // Form fields for customer details
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact Phone Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/MSU Student ID Number/i)).toBeInTheDocument();

    // Form fields for delivery address
    expect(screen.getByLabelText(/Delivery Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Designated Campus Drop Hub/i)).toBeInTheDocument();

    // Product selections
    expect(screen.getByText('Yellow Pad Paper (80 leaves)')).toBeInTheDocument();
    expect(screen.getByText('Pilot G2 Gel Pen 0.5 Black')).toBeInTheDocument();
  });

  it('displays validation errors when submitting with empty required fields', () => {
    render(
      <OrderFormModal
        store={mockStore}
        cart={mockCart}
        onUpdateQuantity={mockOnUpdateQuantity}
        onRemoveItem={mockOnRemoveItem}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    const submitBtn = screen.getByRole('button', { name: /Confirm & Place Order/i });
    fireEvent.click(submitBtn);

    expect(mockOnSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/Customer name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Contact phone number is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Delivery address is required/i)).toBeInTheDocument();
  });

  it('submits form with collected customer details, delivery address, and product selections', () => {
    render(
      <OrderFormModal
        store={mockStore}
        cart={mockCart}
        onUpdateQuantity={mockOnUpdateQuantity}
        onRemoveItem={mockOnRemoveItem}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'Sittie Norhaima' },
    });
    fireEvent.change(screen.getByLabelText(/Contact Phone Number/i), {
      target: { value: '09171234567' },
    });
    fireEvent.change(screen.getByLabelText(/MSU Student ID Number/i), {
      target: { value: '2023-01429' },
    });
    fireEvent.change(screen.getByLabelText(/Delivery Address/i), {
      target: { value: 'Room 304, Dorm 2, MSU Campus' },
    });

    const submitBtn = screen.getByRole('button', { name: /Confirm & Place Order/i });
    fireEvent.click(submitBtn);

    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        customerName: 'Sittie Norhaima',
        customerPhone: '09171234567',
        buyerStudentId: '2023-01429',
        deliveryAddress: 'Room 304, Dorm 2, MSU Campus',
        dropZone: 'Science Complex Drop Hub',
      })
    );
  });

  it('supports modifying product quantities in the order form', () => {
    render(
      <OrderFormModal
        store={mockStore}
        cart={mockCart}
        onUpdateQuantity={mockOnUpdateQuantity}
        onRemoveItem={mockOnRemoveItem}
        onSubmit={mockOnSubmit}
        onClose={mockOnClose}
      />
    );

    const increaseBtn = screen.getByLabelText(/Increase quantity of Yellow Pad Paper/i);
    fireEvent.click(increaseBtn);

    expect(mockOnUpdateQuantity).toHaveBeenCalledWith('prod-1', 3);
  });
});
