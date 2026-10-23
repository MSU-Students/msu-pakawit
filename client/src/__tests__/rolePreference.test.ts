import {
  DEFAULT_SELECTABLE_ROLE,
  ROLE_PREFERENCE_STORAGE_KEY,
  isSelectableRole,
  readStoredRolePreference,
  resolveSelectableRole,
  writeStoredRolePreference,
} from '../modules/shared/rolePreference';

describe('role preference helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('accepts STUDENT, EMPLOYEE, and COURIER only', () => {
    expect(isSelectableRole('STUDENT')).toBe(true);
    expect(isSelectableRole('EMPLOYEE')).toBe(true);
    expect(isSelectableRole('COURIER')).toBe(true);
    expect(isSelectableRole('ADMIN')).toBe(false);
    expect(isSelectableRole('SUPERUSER')).toBe(false);
  });

  it('persists and restores a selectable preference', () => {
    writeStoredRolePreference('COURIER');
    expect(window.localStorage.getItem(ROLE_PREFERENCE_STORAGE_KEY)).toBe('COURIER');
    expect(readStoredRolePreference()).toBe('COURIER');
  });

  it('ignores ADMIN values stored in local storage', () => {
    window.localStorage.setItem(ROLE_PREFERENCE_STORAGE_KEY, 'ADMIN');
    expect(readStoredRolePreference()).toBeNull();
    expect(resolveSelectableRole('ADMIN', 'not-a-role')).toBe(DEFAULT_SELECTABLE_ROLE);
  });
});
