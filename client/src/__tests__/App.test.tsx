import { render, screen } from '@testing-library/react';

jest.mock('../modules/shared/apiClient', () => ({
  apiClient: {
    hasAccessToken: false,
    setAccessToken: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

import App from '../App';

describe('MSU Pakawit App Shell (Sprint 0 Inception)', () => {
  it('renders application title and navigation', () => {
    render(<App />);
    const titleElements = screen.getAllByText(/MSU PAKAWIT/i);
    expect(titleElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/Sprint 0: Architecture/i)).toBeInTheDocument();
  });
});
