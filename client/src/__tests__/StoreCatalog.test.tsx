import { render, screen, fireEvent } from '@testing-library/react';
import { StoreCatalog } from '../modules/storefront/StoreCatalog';
import type { VirtualStore, ProductItem } from '../modules/storefront/types';

describe('StoreCatalog Component Order Flow', () => {
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

  const mockProducts: ProductItem[] = [
    {
      id: 'prod-1',
      storeId: 'store-1',
      name: 'Yellow Pad Paper',
      category: 'School Supplies',
      basePrice: 45.0,
      markupPrice: 49.5,
      isAvailable: true,
    },
    {
      id: 'prod-2',
      storeId: 'store-1',
      name: 'Pilot G2 Gel Pen',
      category: 'School Supplies',
      basePrice: 65.0,
      markupPrice: 71.5,
      isAvailable: true,
    },
  ];

  it('allows user to add products to cart and open the order form', () => {
    const handlePlaceOrder = jest.fn();
    render(
      <StoreCatalog
        store={mockStore}
        products={mockProducts}
        onPlaceOrder={handlePlaceOrder}
      />
    );

    // Initial cart is empty
    expect(screen.getByText(/Select items from the catalog to build an order/i)).toBeInTheDocument();

    // Add first product to cart
    const addButtons = screen.getAllByRole('button', { name: /Add to Errand/i });
    fireEvent.click(addButtons[0]);

    // Cart shows 1 item
    expect(screen.getByText(/Place Order \(Fill Details\)/i)).toBeInTheDocument();

    // Click Place Order to open OrderFormModal
    fireEvent.click(screen.getByText(/Place Order \(Fill Details\)/i));

    // Order form modal is displayed
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Place Purchase Order/i)).toBeInTheDocument();
  });

  it('collects customer details, product selections, and delivery address, generating receipt with status Pending', () => {
    const handlePlaceOrder = jest.fn();
    render(
      <StoreCatalog
        store={mockStore}
        products={mockProducts}
        onPlaceOrder={handlePlaceOrder}
      />
    );

    // Add product to cart
    const addButtons = screen.getAllByRole('button', { name: /Add to Errand/i });
    fireEvent.click(addButtons[0]);

    // Open form
    fireEvent.click(screen.getByText(/Place Order \(Fill Details\)/i));

    // Fill customer details
    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'Sittie Norhaima' },
    });
    fireEvent.change(screen.getByLabelText(/Contact Phone Number/i), {
      target: { value: '09171234567' },
    });
    fireEvent.change(screen.getByLabelText(/Delivery Address/i), {
      target: { value: 'Dormitory 2, Room 304, MSU Campus' },
    });

    // Submit order
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Place Order/i }));

    // onPlaceOrder was called with complete details and status Pending
    expect(handlePlaceOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        customerName: 'Sittie Norhaima',
        customerPhone: '09171234567',
        deliveryAddress: 'Dormitory 2, Room 304, MSU Campus',
        status: 'Pending',
        items: expect.arrayContaining([
          expect.objectContaining({
            productId: 'prod-1',
            name: 'Yellow Pad Paper',
            quantity: 1,
          }),
        ]),
      })
    );

    // Order Receipt is generated and displayed
    expect(screen.getByText(/Order Receipt/i)).toBeInTheDocument();
    expect(screen.getByText(/Purchase request successfully generated/i)).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText(/Timestamp:/i)).toBeInTheDocument();
    expect(screen.getByText(/Sittie Norhaima/i)).toBeInTheDocument();
    expect(screen.getByText(/Dormitory 2, Room 304, MSU Campus/i)).toBeInTheDocument();
  });
});
