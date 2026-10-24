import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { ACCESS_TOKEN_STORAGE_KEY, SESSION_USER_STORAGE_KEY } from '../modules/shared/authSession';
import { ROLE_PREFERENCE_STORAGE_KEY } from '../modules/shared/rolePreference';

describe('MSU Pakawit App Shell (Sprint 0 Inception)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  it('renders application title and navigation', () => {
    render(<App />);
    const titleElements = screen.getAllByText(/MSU PAKAWIT/i);
    expect(titleElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/Sprint 0 Inception/i)).toBeInTheDocument();
  });

  it('restores the saved role preference after reload', () => {
    window.localStorage.setItem(ROLE_PREFERENCE_STORAGE_KEY, 'COURIER');
    render(<App />);
    expect(screen.getByLabelText(/Current active view: COURIER/i)).toBeInTheDocument();
    expect(screen.getByText(/Campus Errand Dispatch Feed/i)).toBeInTheDocument();
  });

  it('saves the selected role locally when the user applies a new view', () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    render(<App />);
    fireEvent.click(screen.getByLabelText(/Current active view: STUDENT/i));
    fireEvent.click(screen.getByText('Courier Runner'));
    fireEvent.click(screen.getByRole('button', { name: /Apply Active View/i }));

    expect(window.localStorage.getItem(ROLE_PREFERENCE_STORAGE_KEY)).toBe('COURIER');
    expect(screen.getByLabelText(/Current active view: COURIER/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('saves the selected role to the authenticated user profile', async () => {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, 'signed-access-token');
    window.localStorage.setItem(
      SESSION_USER_STORAGE_KEY,
      JSON.stringify({
        id: 'user-1',
        username: 'amina.radiamoda',
        fullName: 'Amina Radiamoda',
        role: 'STUDENT',
        preferredRole: 'STUDENT',
      }),
    );

    global.fetch = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/users/me/preferred-role') && init?.method === 'PATCH') {
        return {
          ok: true,
          json: async () => ({
            id: 'user-1',
            username: 'amina.radiamoda',
            fullName: 'Amina Radiamoda',
            role: 'STUDENT',
            preferredRole: 'COURIER',
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({
          id: 'user-1',
          username: 'amina.radiamoda',
          fullName: 'Amina Radiamoda',
          role: 'STUDENT',
          preferredRole: 'STUDENT',
        }),
      };
    }) as jest.Mock;

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Sign out amina.radiamoda/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/Current active view: STUDENT/i));
    fireEvent.click(screen.getByText('Courier Runner'));
    fireEvent.click(screen.getByRole('button', { name: /Apply Active View/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Current active view: COURIER/i)).toBeInTheDocument();
    });

    const patchCall = (global.fetch as jest.Mock).mock.calls.find(
      ([url, init]: [string, RequestInit]) =>
        String(url).includes('/users/me/preferred-role') && init?.method === 'PATCH',
    );

    expect(patchCall).toBeDefined();
    expect(JSON.parse(patchCall[1].body)).toEqual({ preferredRole: 'COURIER' });
    expect(patchCall[1].headers.get('Authorization')).toBe('Bearer signed-access-token');
    expect(window.localStorage.getItem(ROLE_PREFERENCE_STORAGE_KEY)).toBe('COURIER');
    expect(window.localStorage.getItem(SESSION_USER_STORAGE_KEY)).toContain('"preferredRole":"COURIER"');
    expect(window.localStorage.getItem(SESSION_USER_STORAGE_KEY)).toContain('"role":"STUDENT"');
  });

  it('opens registration from the authentication interface without replacing sign-in', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Register a new account/i }));
    expect(screen.getByText(/Create your account/i)).toBeInTheDocument();
    expect(screen.getByRole('form', { name: /Account details/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    fireEvent.click(screen.getByRole('button', { name: /Sign in to save role preference/i }));
    expect(screen.getByRole('form', { name: /Sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create an account/i })).toBeInTheDocument();
  });

  it('restores the profile preference after login without using an ADMIN view', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        accessToken: 'signed-access-token',
        user: {
          id: 'user-1',
          username: 'amina.radiamoda',
          fullName: 'Amina Radiamoda',
          role: 'STUDENT',
          preferredRole: 'EMPLOYEE',
        },
      }),
    }) as jest.Mock;

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Sign in to save role preference/i }));
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'amina.radiamoda' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'correct horse battery staple' } });
    fireEvent.submit(screen.getByRole('form', { name: /Sign in/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Current active view: EMPLOYEE/i)).toBeInTheDocument();
    });
    expect(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)).toBe('signed-access-token');
    expect(window.localStorage.getItem(SESSION_USER_STORAGE_KEY)).toContain('amina.radiamoda');
    expect(screen.queryByText(/ADMIN VIEW/i)).not.toBeInTheDocument();
  });
});
