import { act, render, screen } from '@testing-library/react';
import { apiClient } from '../modules/shared/apiClient';
import type { ApiResponse } from '../modules/shared/types';
import type { UserProfileData } from '../modules/users/UserProfile';
import App from '../App';

jest.mock('../modules/shared/apiClient', () => ({
  apiClient: { get: jest.fn() },
}));

describe('MSU Pakawit App Shell (Sprint 0 Inception)', () => {
  afterEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  it('renders application title and navigation', () => {
    render(<App />);
    const titleElements = screen.getAllByText(/MSU PAKAWIT/i);
    expect(titleElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/Sprint 0 Inception/i)).toBeInTheDocument();
  });

  it('shows the account profile on the dashboard without blocking dashboard content', async () => {
    window.localStorage.setItem('accessToken', 'dashboard-test-token');
    let resolveProfile!: (response: ApiResponse<UserProfileData>) => void;
    const profileRequest = jest.spyOn(apiClient, 'get').mockReturnValue(
      new Promise<ApiResponse<UserProfileData>>((resolve) => {
        resolveProfile = resolve;
      }),
    );

    render(<App />);

    expect(screen.getByText("Amina's Campus Supplies & Snacks")).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Account overview' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading profile');

    await act(async () => {
      resolveProfile({
        success: true,
        data: {
          id: 'user-1',
          fullName: 'Amina Radiamoda',
          email: 'amina@msumain.edu.ph',
          role: 'STUDENT',
          phone: '+63 912 345 6789',
          alternativeEmail: 'amina.personal@example.com',
        },
      });
    });

    expect(screen.getByText('Amina Radiamoda')).toBeInTheDocument();
    expect(screen.getByText('amina@msumain.edu.ph')).toBeInTheDocument();
    expect(screen.getByText('Student')).toBeInTheDocument();
    expect(screen.getByText('+63 912 345 6789')).toBeInTheDocument();
    expect(screen.getByText('amina.personal@example.com')).toBeInTheDocument();
    expect(profileRequest).toHaveBeenCalledWith('/users/me', 'dashboard-test-token');
  });
});
