
import { render, screen, waitFor } from '@testing-library/react';
import { apiClient } from '../../shared/apiClient';
import { UserProfile, mapUserProfile, type UserProfileData } from '../UserProfile';

jest.mock('../../shared/apiClient', () => ({
  apiClient: { get: jest.fn() },
}));

describe('mapUserProfile', () => {
  it.each([
    ['STUDENT', 'Student'],
    ['EMPLOYEE', 'Employee'],
    ['ADMIN', 'Admin'],
    ['INSTRUCTOR', 'Instructor'],
  ])('maps the %s role to a readable label', (role, expectedLabel) => {
    expect(mapUserProfile({
      id: 'user-1',
      fullName: 'Amina Radiamoda',
      email: 'amina@msumain.edu.ph',
      role,
    }).role).toBe(expectedLabel);
  });

  it('uses a placeholder for missing contact details', () => {
    expect(mapUserProfile({
      id: 'user-1',
      fullName: 'Amina Radiamoda',
      email: 'amina@msumain.edu.ph',
      role: 'STUDENT',
    })).toMatchObject({
      phone: 'Not provided',
      alternativeEmail: 'Not provided',
    });
  });
});

describe('UserProfile', () => {
  const getProfile = jest.spyOn(apiClient, 'get');

  beforeEach(() => {
    window.localStorage.setItem('accessToken', 'profile-test-token');
    getProfile.mockReset();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('loads and displays the authenticated user profile from the profile endpoint', async () => {
    const profile: UserProfileData = {
      id: 'user-1',
      fullName: 'Amina Radiamoda',
      email: 'amina@msumain.edu.ph',
      role: 'STUDENT',
      phone: '+63 912 345 6789',
      alternativeEmail: 'amina.personal@example.com',
    };
    getProfile.mockResolvedValue({ success: true, data: profile });

    render(<UserProfile />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading profile');
    await waitFor(() => expect(getProfile).toHaveBeenCalledWith('/users/me', 'profile-test-token'));
    expect(await screen.findByText('Amina Radiamoda')).toBeInTheDocument();
    expect(screen.getByText('amina@msumain.edu.ph')).toBeInTheDocument();
    expect(screen.getByText('Student')).toBeInTheDocument();
    expect(screen.getByText('+63 912 345 6789')).toBeInTheDocument();
    expect(screen.getByText('amina.personal@example.com')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('renders placeholders when contact details are missing', async () => {
    getProfile.mockResolvedValue({
      success: true,
      data: {
        id: 'user-1',
        fullName: 'Amina Radiamoda',
        email: 'amina@msumain.edu.ph',
        role: 'ADMIN',
      },
    });

    render(<UserProfile />);

    expect(await screen.findAllByText('Not provided')).toHaveLength(2);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('reports profile loading errors without rendering incomplete profile data', async () => {
    getProfile.mockResolvedValue({ success: false, error: 'Request failed' });

    render(<UserProfile />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Request failed');
    expect(screen.queryByText('Full name')).not.toBeInTheDocument();
  });

  it('prompts for sign-in when no access token is available', async () => {
    window.localStorage.clear();

    render(<UserProfile />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in to view your profile.');
    expect(getProfile).not.toHaveBeenCalled();
  });
});
