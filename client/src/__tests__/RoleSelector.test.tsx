import { render, screen, fireEvent } from '@testing-library/react';
import { RoleSelector, ROLE_OPTIONS } from '../modules/shared/RoleSelector';

describe('RoleSelector Component', () => {
  it('renders selectable roles: Student, Employee, Courier', () => {
    render(
      <RoleSelector
        activeRole="STUDENT"
        onSelectRole={jest.fn()}
      />
    );

    expect(screen.getByText('Student')).toBeInTheDocument();
    expect(screen.getByText('Employee / Faculty')).toBeInTheDocument();
    expect(screen.getByText('Courier Runner')).toBeInTheDocument();
  });

  it('strictly excludes the ADMIN role from selectable options', () => {
    render(
      <RoleSelector
        activeRole="STUDENT"
        onSelectRole={jest.fn()}
      />
    );

    // ADMIN must not be an option in the role options array or rendered as a radio choice
    const adminRoleOption = ROLE_OPTIONS.find((opt: any) => opt.role === 'ADMIN');
    expect(adminRoleOption).toBeUndefined();

    // Verify there is no radio item for ADMIN
    const radioItems = screen.getAllByRole('radio');
    expect(radioItems).toHaveLength(3);
    expect(screen.queryByRole('radio', { name: /admin/i })).not.toBeInTheDocument();
  });

  it('displays the clear interface vs account permissions notice', () => {
    render(
      <RoleSelector
        activeRole="STUDENT"
        accountRole="STUDENT"
        onSelectRole={jest.fn()}
      />
    );

    expect(screen.getByText(/Interface View vs. Account Permissions/i)).toBeInTheDocument();
    expect(screen.getByText(/does not alter your registered account credentials/i)).toBeInTheDocument();
    expect(screen.getByText(/Account Role:/i)).toBeInTheDocument();
  });

  it('calls onSelectRole when user selects a different role and clicks Apply', () => {
    const handleSelectRole = jest.fn();
    const handleClose = jest.fn();

    render(
      <RoleSelector
        activeRole="STUDENT"
        onSelectRole={handleSelectRole}
        onClose={handleClose}
        isModal
      />
    );

    // Click Courier role radio card
    const courierRadio = screen.getByText('Courier Runner');
    fireEvent.click(courierRadio);

    // Click Apply Active View button
    const applyButton = screen.getByRole('button', { name: /Apply Active View/i });
    fireEvent.click(applyButton);

    expect(handleSelectRole).toHaveBeenCalledWith('COURIER');
    expect(handleClose).toHaveBeenCalled();
  });

  it('marks current active role with an Active View badge', () => {
    render(
      <RoleSelector
        activeRole="COURIER"
        onSelectRole={jest.fn()}
      />
    );

    expect(screen.getByText('Active View')).toBeInTheDocument();
  });

  it('closes dialog when cancel button is clicked', () => {
    const handleClose = jest.fn();

    render(
      <RoleSelector
        activeRole="STUDENT"
        onSelectRole={jest.fn()}
        onClose={handleClose}
        isModal
      />
    );

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
