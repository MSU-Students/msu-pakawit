import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { db } from '../modules/offline/db';

describe('MSU Pakawit role onboarding and app shell', () => {
  beforeEach(async () => {
    window.history.pushState({}, '', '/');
    await db.userProfiles.clear();
  });

  afterEach(async () => {
    await db.userProfiles.clear();
    window.history.pushState({}, '', '/');
  });

  it('shows role selection and persists the role before entering the app', async () => {
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Choose your role' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /Student/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('heading', { name: 'Student home' })).toBeInTheDocument();
    await waitFor(async () => {
      expect(await db.getCurrentUserProfile()).toEqual({ id: 'current', role: 'STUDENT' });
    });
  });

  it('skips role selection for a returning profile with a saved role', async () => {
    await db.saveCurrentUserRole('EMPLOYEE');
    render(<App />);

    const titleElements = screen.getAllByText(/MSU PAKAWIT/i);
    expect(titleElements.length).toBeGreaterThan(0);
    expect(await screen.findByRole('heading', { name: 'Employee home' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Choose your role' })).not.toBeInTheDocument();
  });

  it('opens the courier home on the delivery task tab', async () => {
    await db.saveCurrentUserRole('COURIER');
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Courier home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Errand Dispatch' })).toHaveClass('bg-msu-maroon-dark');
  });

  it('requires a persisted role before displaying registration and preserves selection on back', async () => {
    window.history.pushState({}, '', '/register');
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Choose your role' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Courier/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(await db.getCurrentUserProfile()).toEqual({ id: 'current', role: 'COURIER' });
    await userEvent.click(screen.getByRole('button', { name: 'Back to role selection' }));

    expect(screen.getByRole('button', { name: /Courier/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });
});
