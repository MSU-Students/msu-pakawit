import { cleanup, render, screen } from '@testing-library/react';
import App from '../App';
import { VERIFIED_PROFILE_KEY } from '../modules/auth/user-role';

describe('role-aware application navigation', () => {
  afterEach(() => {
    cleanup();
    localStorage.removeItem(VERIFIED_PROFILE_KEY);
  });

  it('shows Dispatch to verified Couriers', () => {
    localStorage.setItem(VERIFIED_PROFILE_KEY, JSON.stringify({ role: 'COURIER' }));
    render(<App />);

    expect(screen.getByText('Courier')).toBeInTheDocument();
    expect(screen.getByText('Errand Dispatch')).toBeInTheDocument();
  });

  it('does not display academic restrictions to Employees', () => {
    localStorage.setItem(VERIFIED_PROFILE_KEY, JSON.stringify({ role: 'EMPLOYEE' }));
    render(<App />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each(['STUDENT', 'EMPLOYEE'])('hides Dispatch from %s accounts', (role) => {
    localStorage.setItem(VERIFIED_PROFILE_KEY, JSON.stringify({ role }));
    render(<App />);

    expect(screen.getByText(role === 'STUDENT' ? 'Student' : 'Employee')).toBeInTheDocument();
    expect(screen.queryByText('Errand Dispatch')).not.toBeInTheDocument();
  });
});
