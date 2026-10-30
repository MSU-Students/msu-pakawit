import { fireEvent, render, screen } from '@testing-library/react';
import type { AuthenticatedApiClient } from '../modules/shared/apiClient';

jest.mock('../modules/shared/apiClient', () => ({
  apiClient: {
    hasAccessToken: false,
    setAccessToken: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
  },
}));

import { ProfileSettings } from '../modules/users/ProfileSettings';

const adminProfile = {
  id: 'admin-user',
  username: 'admin.user',
  fullName: 'Admin User',
  email: 'admin@example.test',
  role: 'ADMIN' as const,
  msuIdNumber: '2026-00001',
  isActive: true,
};

const studentProfile = {
  id: 'student-user',
  username: 'student.user',
  fullName: 'Student User',
  email: 'student@example.test',
  role: 'STUDENT' as const,
  msuIdNumber: '2026-00002',
  isActive: true,
};

const createClient = (profile: typeof adminProfile | typeof studentProfile) => {
  const client = {
    hasAccessToken: false,
    setAccessToken: jest.fn(),
    post: jest.fn().mockResolvedValue({
      success: true,
      data: { accessToken: 'test-access-token' },
    }),
    get: jest.fn().mockImplementation((path: string) => Promise.resolve({
      success: true,
      data: path === '/users/me' ? profile : [adminProfile, studentProfile],
    })),
    patch: jest.fn().mockResolvedValue({
      success: true,
      data: { ...studentProfile, role: 'COURIER' },
    }),
  };
  return client as unknown as AuthenticatedApiClient & typeof client;
};

const signIn = async () => {
  fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'admin.user' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  await screen.findByTestId('profile-role');
};

describe('ProfileSettings', () => {
  it('shows the authenticated role and lets admins change a selected user role', async () => {
    const client = createClient(adminProfile);
    render(<ProfileSettings client={client} />);

    await signIn();
    expect(screen.getByTestId('profile-role')).toHaveTextContent('ADMIN');

    fireEvent.change(screen.getByLabelText('User account'), {
      target: { value: 'student-user' },
    });
    fireEvent.change(screen.getByLabelText('Role'), {
      target: { value: 'COURIER' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save role' }));

    await screen.findByRole('status');
    expect(client.patch).toHaveBeenCalledWith('/users/student-user/role', { role: 'COURIER' });
    expect(screen.getByRole('status')).toHaveTextContent('Role updated to COURIER.');
  });

  it('does not show role editing controls to non-admin users', async () => {
    const client = createClient(studentProfile);
    render(<ProfileSettings client={client} />);
    await signIn();

    expect(screen.getByTestId('profile-role')).toHaveTextContent('STUDENT');
    expect(screen.queryByText('Manage user roles')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save role' })).not.toBeInTheDocument();
  });
});
