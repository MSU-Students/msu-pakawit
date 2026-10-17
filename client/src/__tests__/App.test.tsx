import { render, screen } from '@testing-library/react';
jest.mock('../modules/shared/apiClient', () => ({
  apiClient: { post: jest.fn().mockResolvedValue({ success: true, data: { message: 'Test message' } }) },
}));
import App from '../App';

describe('MSU Pakawit App Shell (Sprint 0 Inception)', () => {
  it('renders application title and navigation', () => {
    render(<App />);
    const titleElements = screen.getAllByText(/MSU PAKAWIT/i);
    expect(titleElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/Sprint 0:/i)).toBeInTheDocument();
  });
});
