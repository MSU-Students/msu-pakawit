import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { OnboardingRegister } from '../modules/auth/OnboardingRegister';
import { ROLE_OPTIONS } from '../modules/shared/RoleSelector';

const fillAccountDetails = () => {
  fireEvent.change(screen.getByLabelText(/MSU ID number/i), { target: { value: '2026-01429' } });
  fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: 'Amina Radiamoda' } });
  fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'amina.radiamoda' } });
  fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: 'amina@msumain.edu.ph' } });
  fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'correct horse battery staple' } });
};

describe('OnboardingRegister', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('renders account details first and lists every supported role without ADMIN', () => {
    render(<OnboardingRegister onClose={jest.fn()} onGoToSignIn={jest.fn()} />);

    expect(screen.getByRole('form', { name: /Account details/i })).toBeInTheDocument();
    fillAccountDetails();
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'too-short' } });
    fireEvent.submit(screen.getByRole('form', { name: /Account details/i }));
    expect(screen.getByText(/Password must be between 12 and 128 characters/i)).toBeInTheDocument();

    fillAccountDetails();
    fireEvent.click(screen.getByRole('button', { name: /Continue to role selection/i }));

    expect(screen.getByText(/Step 2 of 3: Choose one platform role/i)).toBeInTheDocument();
    expect(screen.getByText('Student')).toBeInTheDocument();
    expect(screen.getByText('Employee / Faculty')).toBeInTheDocument();
    expect(screen.getByText('Courier Runner')).toBeInTheDocument();
    expect(ROLE_OPTIONS.find((option) => (option as { role: string }).role === 'ADMIN')).toBeUndefined();
    expect(screen.queryByText(/^ADMIN$/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('blocks role continuation until a valid role is selected', () => {
    render(<OnboardingRegister onClose={jest.fn()} onGoToSignIn={jest.fn()} />);
    fillAccountDetails();
    fireEvent.click(screen.getByRole('button', { name: /Continue to role selection/i }));
    fireEvent.click(screen.getByRole('button', { name: /Continue to review/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/Select Student, Employee \/ Faculty, or Courier Runner/i);
    expect(screen.queryByText(/Step 3 of 3/i)).not.toBeInTheDocument();
  });

  it('reviews the selected role, hides the password, and allows changing the role', () => {
    render(<OnboardingRegister onClose={jest.fn()} onGoToSignIn={jest.fn()} />);
    fillAccountDetails();
    fireEvent.click(screen.getByRole('button', { name: /Continue to role selection/i }));
    fireEvent.click(screen.getByText('Courier Runner'));
    fireEvent.click(screen.getByRole('button', { name: /Continue to review/i }));

    expect(screen.getByText(/Step 3 of 3: Review and confirm your selected role/i)).toBeInTheDocument();
    expect(screen.getByText(/Courier Runner \(COURIER\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Password is set and hidden/i)).toBeInTheDocument();
    expect(screen.queryByText('correct horse battery staple')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Change role/i }));
    fireEvent.click(screen.getByText('Employee / Faculty'));
    fireEvent.click(screen.getByRole('button', { name: /Continue to review/i }));
    expect(screen.getByText(/Employee \/ Faculty \(EMPLOYEE\)/i)).toBeInTheDocument();
  });

  it('submits the selected role once and handles success', async () => {
    const onGoToSignIn = jest.fn();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'user-1',
        username: 'amina.radiamoda',
        role: 'COURIER',
        preferredRole: 'COURIER',
        isCourierVerified: false,
      }),
    }) as jest.Mock;

    render(<OnboardingRegister onClose={jest.fn()} onGoToSignIn={onGoToSignIn} />);
    fillAccountDetails();
    fireEvent.click(screen.getByRole('button', { name: /Continue to role selection/i }));
    fireEvent.click(screen.getByText('Courier Runner'));
    fireEvent.click(screen.getByRole('button', { name: /Continue to review/i }));
    fireEvent.click(screen.getByRole('button', { name: /Create account/i }));
    fireEvent.click(screen.getByRole('button', { name: /Create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Your Courier Runner account was created/i)).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)).toEqual({
      msuIdNumber: '2026-01429',
      fullName: 'Amina Radiamoda',
      username: 'amina.radiamoda',
      email: 'amina@msumain.edu.ph',
      password: 'correct horse battery staple',
      role: 'COURIER',
    });

    fireEvent.click(screen.getByRole('button', { name: /^Sign in$/i }));
    expect(onGoToSignIn).toHaveBeenCalledWith('amina.radiamoda');
  });

  it('shows a safe API error and keeps the review step', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      json: async () => ({ message: 'A user with one of these identifiers already exists' }),
    }) as jest.Mock;

    render(<OnboardingRegister onClose={jest.fn()} onGoToSignIn={jest.fn()} />);
    fillAccountDetails();
    fireEvent.click(screen.getByRole('button', { name: /Continue to role selection/i }));
    fireEvent.click(screen.getByText('Student'));
    fireEvent.click(screen.getByRole('button', { name: /Continue to review/i }));
    fireEvent.click(screen.getByRole('button', { name: /Create account/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/A user with one of these identifiers already exists/i);
    });
    expect(screen.getByText(/Step 3 of 3/i)).toBeInTheDocument();
  });
});
