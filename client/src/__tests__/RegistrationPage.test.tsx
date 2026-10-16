import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RegistrationPage } from '../modules/auth/RegistrationPage';

describe('RegistrationPage', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('submits required account details and shows the email verification prompt', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Check your email for a verification link to complete registration.' }),
    });
    global.fetch = fetchMock;
    render(<RegistrationPage />);

    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Amina Radiamoda' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'amina@msumain.edu.ph' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'amina.radiamoda' } });
    fireEvent.change(screen.getByLabelText('MSU ID number'), { target: { value: '2026-01429' } });
    fireEvent.change(screen.getByLabelText('Account role'), { target: { value: 'COURIER' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'a-long-registration-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({
      method: 'POST',
    })));
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({
      fullName: 'Amina Radiamoda',
      email: 'amina@msumain.edu.ph',
      username: 'amina.radiamoda',
      msuIdNumber: '2026-01429',
      password: 'a-long-registration-password',
      role: 'COURIER',
    });
    expect(await screen.findByText('Your account will be created after you verify your email.')).toBeInTheDocument();
  });

  it('submits the verification token from the emailed link', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        message: 'Email verified. Your account is ready; you can now sign in.',
        user: { id: 'user-1', username: 'amina.radiamoda', fullName: 'Amina Radiamoda', role: 'COURIER' },
      }),
    });
    global.fetch = fetchMock;
    render(<RegistrationPage verificationToken="one-time-token" />);

    fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/auth/verify-email', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ token: 'one-time-token' }),
    })));
    expect(await screen.findByRole('status')).toHaveTextContent(/account is ready/i);
    expect(screen.getByRole('status')).toHaveTextContent('Your role: Courier');
    expect(JSON.parse(localStorage.getItem('msu-pakawit-verified-profile') as string).role).toBe('COURIER');
  });
});
