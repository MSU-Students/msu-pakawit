import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RoleSelectionScreen } from '../modules/roles/RoleSelectionScreen';
import type { UserRole } from '../modules/roles/role';

describe('RoleSelectionScreen', () => {
  it('shows all role choices and disables Continue until one is selected', async () => {
    const onRoleSelect = jest.fn();
    const onContinue = jest.fn();
    render(
      <RoleSelectionScreen
        selectedRole={null}
        onRoleSelect={onRoleSelect}
        onContinue={onContinue}
      />,
    );

    expect(screen.getByRole('button', { name: /Student/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Employee/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Courier/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /Courier/ }));
    expect(onRoleSelect).toHaveBeenCalledWith('COURIER');
  });

  it.each([
    ['STUDENT', 'Student'],
    ['EMPLOYEE', 'Employee'],
    ['COURIER', 'Courier'],
  ] as const)('announces %s selection and enables Continue', (role: UserRole, label: string) => {
    render(
      <RoleSelectionScreen
        selectedRole={role}
        onRoleSelect={jest.fn()}
        onContinue={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: new RegExp(label) })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(`${label} selected.`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });
});
