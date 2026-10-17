import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiClient } from '../modules/shared/apiClient';
import { RegistrationPage } from '../modules/auth/RegistrationPage';

jest.mock('../modules/shared/apiClient', () => ({
  apiClient: { post: jest.fn() },
}));

const post = apiClient.post as jest.Mock;

describe('RegistrationPage', () => {
  beforeEach(() => {
    post.mockReset();
  });

  it('submits the required account details and offers to resend the email', async () => {
    post.mockResolvedValueOnce({
      success: true,
      data: { message: 'Registration started. Check your email.' },
    }).mockResolvedValueOnce({
      success: true,
      data: { message: 'A verification link has been sent.' },
    });

    render(<RegistrationPage verificationToken={null} onBack={jest.fn()} />);
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Amina Radiamoda' } });
    fireEvent.change(screen.getByLabelText('MSU ID number'), { target: { value: '2026-01429' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'amina.radiamoda' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'amina@msumain.edu.ph' } });
    fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'correct horse battery staple' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    await screen.findByText('Registration started. Check your email.');
    expect(post).toHaveBeenNthCalledWith(1, '/auth/register', {
      msuIdNumber: '2026-01429',
      username: 'amina.radiamoda',
      fullName: 'Amina Radiamoda',
      email: 'amina@msumain.edu.ph',
      password: 'correct horse battery staple',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Resend verification email' }));
    await waitFor(() => expect(post).toHaveBeenNthCalledWith(2, '/auth/resend-verification', {
      email: 'amina@msumain.edu.ph',
    }));
  });

  it('verifies a link once even when React StrictMode re-runs the effect', async () => {
    post.mockResolvedValue({
      success: true,
      data: { message: 'Email verified. You can now sign in.' },
    });

    render(
      <StrictMode>
        <RegistrationPage verificationToken="one-time-token" onBack={jest.fn()} />
      </StrictMode>,
    );

    await screen.findByText('Email verified. You can now sign in.');
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/auth/verify-email', { token: 'one-time-token' });
  });
});
