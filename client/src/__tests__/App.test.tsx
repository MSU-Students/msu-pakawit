import { render, screen } from '@testing-library/react';
import App from '../App';

describe('MSU Pakawit App Shell (Sprint 0 Inception)', () => {
  it('renders application title and navigation', () => {
    render(<App />);
    const titleElements = screen.getAllByText(/MSU PAKAWIT/i);
    expect(titleElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/Sprint 0 Inception/i)).toBeInTheDocument();
  });
});
