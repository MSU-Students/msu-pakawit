import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { apiClient } from '../modules/shared/apiClient';
import { RegisterPage, VerifyEmailPage } from '../modules/auth/AuthPages';
import type { UserRole } from '../modules/roles/role';

jest.mock('../modules/shared/apiClient', () => ({
  apiClient: { post: jest.fn() },
}));

const post = jest.mocked(apiClient.post);
const registrationRole: UserRole = 'STUDENT';

describe('Email registration pages', () => {
  beforeEach(() => {
    post.mockReset();
  });

  it('shows inline validation without sending invalid registration data', async () => {
    render(<RegisterPage role={registrationRole} />);
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters.')).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('shows check-email state after registration and applies resend cooldown', async () => {
    post.mockResolvedValueOnce({ success: true, data: { message: 'accepted' } });
    render(<RegisterPage role={registrationRole} />);

    await userEvent.type(screen.getByLabelText('Email address'), 'amina@msumain.edu.ph');
    await userEvent.type(screen.getByLabelText('Full name'), 'Amina Radiamoda');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Check your email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend available in 60s/i })).toBeDisabled();
    expect(post).toHaveBeenCalledWith('/auth/register', {
      email: 'amina@msumain.edu.ph',
      fullName: 'Amina Radiamoda',
      password: 'password123',
      role: 'STUDENT',
    });
  });

  it('renders a log-in link after successful verification', async () => {
    post.mockResolvedValueOnce({ success: true, data: { message: 'verified' } });
    window.history.pushState({}, '', '/verify-email?token=verification-token');
    render(<VerifyEmailPage />);

    const loginLink = await screen.findByRole('link', { name: 'Log in' });
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('offers resend for an expired link and distinguishes an invalid link', async () => {
    post.mockResolvedValueOnce({ success: false, code: 'LINK_EXPIRED', error: 'expired' });
    window.history.pushState({}, '', '/verify-email?token=expired-token');
    const expiredRender = render(<VerifyEmailPage />);
    expect(await screen.findByText('Verification link expired')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Resend verification email' })).toBeInTheDocument();
    expiredRender.unmount();

    post.mockResolvedValueOnce({ success: false, code: 'INVALID_OR_USED_LINK', error: 'invalid' });
    window.history.pushState({}, '', '/verify-email?token=used-token');
    render(<VerifyEmailPage />);
    expect(await screen.findByText('Link is invalid or already used')).toBeInTheDocument();
  });
});
