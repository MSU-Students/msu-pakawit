export const ACCESS_TOKEN_STORAGE_KEY = 'msuPakawit.accessToken';
export const SESSION_USER_STORAGE_KEY = 'msuPakawit.sessionUser';

export interface SessionUser {
  id: string;
  username: string;
  fullName?: string;
  role?: string;
  preferredRole?: string;
}

const canUseStorage = (): boolean => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const getAccessToken = (): string | null => {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
};

export const getSessionUser = (): SessionUser | null => {
  if (!canUseStorage()) return null;
  const raw = window.localStorage.getItem(SESSION_USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.id !== 'string' || typeof parsed.username !== 'string') {
      return null;
    }
    return parsed as SessionUser;
  } catch {
    return null;
  }
};

export const setSession = (accessToken: string, user: SessionUser): void => {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
  window.localStorage.setItem(SESSION_USER_STORAGE_KEY, JSON.stringify(user));
};

export const clearSession = (): void => {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(SESSION_USER_STORAGE_KEY);
};
