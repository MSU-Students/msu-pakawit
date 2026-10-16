import { render, screen } from '@testing-library/react';
import { ErrandFeed } from '../modules/dispatch/ErrandFeed';

describe('ErrandFeed academic time-lock message', () => {
  it('explains the restriction and disables errand actions during class', () => {
    render(<ErrandFeed
      tasks={[{
        id: 'ERR-1001',
        storeName: 'Campus Supplies',
        vendorOrigin: 'Commercial Center',
        dropZone: 'Science Complex Hub',
        itemCount: 1,
        totalAmount: 50,
        convenienceFee: 10,
        status: 'PENDING',
        buyerName: 'Student',
        createdAt: Date.now(),
      }]}
      isLockedBySchedule
    />);

    expect(screen.getByRole('alert')).toHaveTextContent(/class schedule temporarily blocks accepting or updating errands/i);
    expect(screen.getByRole('button', { name: /locked \(class schedule\)/i })).toBeDisabled();
  });
});
