import { fireEvent, render, screen } from '@testing-library/react';
import { MerchantProfileSettings } from '../MerchantProfileSettings';

describe('MerchantProfileSettings', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('shows the default student ID and validates its 9-digit format', () => {
    render(<MerchantProfileSettings />);
    const studentId = screen.getByLabelText(/MSU student ID/i);

    expect(studentId).toHaveValue('202409922');

    fireEvent.change(studentId, { target: { value: '2024-09922' } });
    fireEvent.blur(studentId);

    expect(screen.getByText('Student ID must be 9 digits.')).toBeInTheDocument();
  });

  it('saves valid profile changes to browser storage', () => {
    render(<MerchantProfileSettings />);
    const studentId = screen.getByLabelText(/MSU student ID/i);
    fireEvent.change(studentId, { target: { value: '123456789' } });

    fireEvent.click(screen.getByRole('button', { name: /save merchant profile/i }));

    expect(screen.getByRole('status')).toHaveTextContent('Merchant profile saved on this device.');
    expect(JSON.parse(window.localStorage.getItem('msu_pakawit_merchant_profile') || '{}')).toEqual(
      expect.objectContaining({ studentId: '123456789' }),
    );
  });

  it('limits the selected selling categories to five', () => {
    render(<MerchantProfileSettings />);
    const fifthCategory = screen.getByRole('button', { name: /\+ Electronics & Gadgets/ });
    const sixthCategory = screen.getByRole('button', { name: /\+ Apparel & Hijabs/ });

    fireEvent.click(fifthCategory);
    fireEvent.click(sixthCategory);

    expect(screen.getByRole('alert')).toHaveTextContent('You can select up to 5 categories.');
    expect(sixthCategory).toHaveAttribute('aria-pressed', 'false');
  });
});
