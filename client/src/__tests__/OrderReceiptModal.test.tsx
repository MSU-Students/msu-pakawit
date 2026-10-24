import { render, screen, fireEvent } from '@testing-library/react';
import { OrderReceiptModal } from '../modules/storefront/OrderReceiptModal';
import type { OrderReceiptData } from '../modules/storefront/types';

describe('OrderReceiptModal Component', () => {
  const mockReceipt: OrderReceiptData = {
    id: 'ORD-78192',
    storeId: 'store-1',
    storeName: "Amina's Campus Supplies",
    vendorOrigin: 'Commercial Center (Off-Campus)',
    hostName: 'Amina Radiamoda',
    customerName: 'Sittie Norhaima',
    customerPhone: '09171234567',
    buyerStudentId: '2023-01429',
    deliveryAddress: 'Dormitory 2, Room 304, MSU Marawi Campus',
    dropZone: 'Science Complex Drop Hub',
    deliveryNotes: 'Call before arriving',
    items: [
      {
        productId: 'prod-1',
        name: 'Yellow Pad Paper (80 leaves)',
        quantity: 2,
        unitPrice: 49.5,
      },
      {
        productId: 'prod-2',
        name: 'Pilot G2 Gel Pen 0.5 Black',
        quantity: 1,
        unitPrice: 71.5,
      },
    ],
    totalProductCost: 170.5,
    convenienceFee: 35.0,
    totalAmount: 205.5,
    status: 'Pending',
    createdAt: 1760780000000,
  };

  const mockOnClose = jest.fn();
  const mockOnPrint = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders order receipt with order ID and timestamp', () => {
    render(
      <OrderReceiptModal
        receipt={mockReceipt}
        onClose={mockOnClose}
        onPrint={mockOnPrint}
      />
    );

    // Acceptance Criteria: Order receipt is generated with order ID and timestamp
    expect(screen.getByText('#ORD-78192')).toBeInTheDocument();
    expect(screen.getByText(/Timestamp:/i)).toBeInTheDocument();
  });

  it('displays order status as "Pending" upon creation', () => {
    render(
      <OrderReceiptModal
        receipt={mockReceipt}
        onClose={mockOnClose}
        onPrint={mockOnPrint}
      />
    );

    // Acceptance Criteria: Order status is set to "Pending" upon creation
    const pendingBadges = screen.getAllByText('Pending');
    expect(pendingBadges.length).toBeGreaterThan(0);
  });

  it('displays customer details, delivery address, and product selections', () => {
    render(
      <OrderReceiptModal
        receipt={mockReceipt}
        onClose={mockOnClose}
        onPrint={mockOnPrint}
      />
    );

    // Customer details
    expect(screen.getByText(/Sittie Norhaima/i)).toBeInTheDocument();
    expect(screen.getByText(/09171234567/i)).toBeInTheDocument();
    expect(screen.getByText(/2023-01429/i)).toBeInTheDocument();

    // Delivery address
    expect(screen.getByText(/Dormitory 2, Room 304, MSU Marawi Campus/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Science Complex Drop Hub/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Call before arriving/i)).toBeInTheDocument();

    // Product selections
    expect(screen.getByText('Yellow Pad Paper (80 leaves)')).toBeInTheDocument();
    expect(screen.getByText('Pilot G2 Gel Pen 0.5 Black')).toBeInTheDocument();

    // Financial totals
    expect(screen.getByText('₱170.50')).toBeInTheDocument();
    expect(screen.getByText('₱35.00')).toBeInTheDocument();
    expect(screen.getByText('₱205.50')).toBeInTheDocument();
  });

  it('handles print and close interactions', () => {
    render(
      <OrderReceiptModal
        receipt={mockReceipt}
        onClose={mockOnClose}
        onPrint={mockOnPrint}
      />
    );

    const printBtn = screen.getByRole('button', { name: /Print Receipt/i });
    fireEvent.click(printBtn);
    expect(mockOnPrint).toHaveBeenCalled();

    const doneBtn = screen.getByRole('button', { name: /Done/i });
    fireEvent.click(doneBtn);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
