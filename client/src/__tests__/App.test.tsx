import { fireEvent, render, screen } from '@testing-library/react';

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
import { db } from '../modules/offline/db';

describe('MSU Pakawit App Shell (Sprint 0 Inception)', () => {
  afterEach(async () => {
    await db.profileImages.delete('local-demo-profile');
  });

  it('renders application title and navigation', () => {
    render(<App />);
    const titleElements = screen.getAllByText(/MSU PAKAWIT/i);
    expect(titleElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/Sprint 0: Architecture/i)).toBeInTheDocument();
  });

  it('keeps a saved profile image after the app is refreshed', async () => {
    const { unmount } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^Profile$/i }));

    fireEvent.change(screen.getByLabelText('Choose profile image'), {
      target: { files: [new File(['image-data'], 'profile.png', { type: 'image/png' })] },
    });
    const preview = await screen.findByAltText('Profile picture preview');
    const savedImage = preview.getAttribute('src');

    fireEvent.click(screen.getByRole('button', { name: 'Save profile image' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/saved in this browser/i);

    unmount();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^Profile$/i }));

    expect(await screen.findByAltText('Current profile')).toHaveAttribute('src', savedImage);
  });

  it('does not restore a deleted profile image after refreshing the app', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    const { unmount } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /^Profile$/i }));
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
    fireEvent.click(screen.getByRole('button', { name: /^Profile$/i }));

    expect(await screen.findByLabelText('Default avatar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Picture' })).toBeDisabled();
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    confirmSpy.mockRestore();
  });
});
