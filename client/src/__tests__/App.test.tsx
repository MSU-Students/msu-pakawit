import { render, screen } from '@testing-library/react';
import App from '../App';

jest.mock('../modules/storefront/storefrontApi', () => ({
  storefrontApi: {
    listStores: jest.fn().mockResolvedValue({ success: true, data: [] }),
  },
}));

jest.mock('../modules/shared/apiClient', () => ({
  apiClient: { setAccessToken: jest.fn() },
}));

describe('MSU Pakawit App Shell (Sprint 0 Inception)', () => {
  it('renders application title and navigation', () => {
    render(<App />);
    const titleElements = screen.getAllByText(/MSU PAKAWIT/i);
    expect(titleElements.length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Storefront/i }).length).toBeGreaterThan(0);
  });
});
