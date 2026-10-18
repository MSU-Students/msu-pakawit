jest.mock('../modules/shared/apiClient', () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({
      success: true,
      data: [],
    }),
    post: jest.fn(),
  },
}));

import { render, screen } from '@testing-library/react';
import App from '../App';

describe('MSU Pakawit App Shell', () => {
  it('renders the application title and navigation', () => {
    render(<App />);

    expect(
      screen.getAllByText(/MSU PAKAWIT/i).length
    ).toBeGreaterThan(0);

    expect(
      screen.getAllByText(/^Storefront$/i).length
    ).toBeGreaterThan(0);

    expect(
      screen.getByText(/Errand Dispatch/i)
    ).toBeInTheDocument();
  });
});