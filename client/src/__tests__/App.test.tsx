import { fireEvent, act, render, screen } from '@testing-library/react';
import { apiClient } from '../modules/shared/apiClient';
import type { ApiResponse } from '../modules/shared/types';
import type { UserProfileData } from '../modules/users/UserProfile';
import App from '../App';
import { db } from '../modules/offline/db';

jest.mock('../modules/shared/apiClient', () => ({
  apiClient: { get: jest.fn() },
}));

describe('MSU Pakawit App Shell (Sprint 0 Inception)', () => {
  afterEach(async () => {
    window.localStorage.clear();
    jest.restoreAllMocks();
    await db.profileImages.delete('local-demo-profile');
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
  it('keeps a saved profile image after the app is refreshed', async () => {
    const { unmount } = render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Profile' })[1]);

    fireEvent.change(screen.getByLabelText('Choose profile image'), {
      target: { files: [new File(['image-data'], 'profile.png', { type: 'image/png' })] },
    });
    const preview = await screen.findByAltText('Profile picture preview');
    const savedImage = preview.getAttribute('src');

    fireEvent.click(screen.getByRole('button', { name: 'Save profile image' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/saved in this browser/i);

    unmount();
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Profile' })[1]);

    expect(await screen.findByAltText('Current profile')).toHaveAttribute('src', savedImage);
  });

  it('does not restore a deleted profile image after refreshing the app', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const { unmount } = render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Profile' })[1]);
    fireEvent.change(screen.getByLabelText('Choose profile image'), {
      target: { files: [new File(['image-data'], 'profile.png', { type: 'image/png' })] },
    });
    await screen.findByAltText('Profile picture preview');
    fireEvent.click(screen.getByRole('button', { name: 'Save profile image' }));
    await screen.findByRole('status');

    fireEvent.click(screen.getByRole('button', { name: 'Delete Picture' }));
    expect(await screen.findByLabelText('Default avatar')).toBeInTheDocument();
    expect(await screen.findByRole('status')).toHaveTextContent(/deleted from this browser/i);

    unmount();
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Profile' })[1]);

    expect(await screen.findByLabelText('Default avatar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Picture' })).toBeDisabled();
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    confirmSpy.mockRestore();
  });
});
