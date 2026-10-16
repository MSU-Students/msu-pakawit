export const USER_ROLES = ['STUDENT', 'EMPLOYEE', 'COURIER'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  STUDENT: 'Student',
  EMPLOYEE: 'Employee',
  COURIER: 'Courier',
};

export const VERIFIED_PROFILE_KEY = 'msu-pakawit-verified-profile';
export const ACCESS_TOKEN_KEY = 'msu-pakawit-access-token';

export const isUserRole = (value: unknown): value is UserRole =>
  typeof value === 'string' && USER_ROLES.includes(value as UserRole);

export const getStoredUserRole = (): UserRole => {
  try {
    const profile = localStorage.getItem(VERIFIED_PROFILE_KEY);
    const role = profile ? JSON.parse(profile).role : null;
    return isUserRole(role) ? role : 'STUDENT';
  } catch {
    return 'STUDENT';
  }
};
