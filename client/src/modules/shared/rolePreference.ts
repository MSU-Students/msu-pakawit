import { ROLE_OPTIONS, type SelectableRole } from './RoleSelector';

export const ROLE_PREFERENCE_STORAGE_KEY = 'msuPakawit.preferredRole';
export const DEFAULT_SELECTABLE_ROLE: SelectableRole = 'STUDENT';

export const isSelectableRole = (value: unknown): value is SelectableRole =>
  ROLE_OPTIONS.some((option) => option.role === value);

export const readStoredRolePreference = (): SelectableRole | null => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return null;
  const stored = window.localStorage.getItem(ROLE_PREFERENCE_STORAGE_KEY);
  return isSelectableRole(stored) ? stored : null;
};

export const writeStoredRolePreference = (role: SelectableRole): void => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') return;
  window.localStorage.setItem(ROLE_PREFERENCE_STORAGE_KEY, role);
};

export const resolveSelectableRole = (...candidates: unknown[]): SelectableRole => {
  for (const candidate of candidates) {
    if (isSelectableRole(candidate)) return candidate;
  }
  return DEFAULT_SELECTABLE_ROLE;
};
