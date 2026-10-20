import { getRoleFeatures, isUserRole, ROLE_FEATURES, USER_ROLES } from '../modules/roles/role';

describe('user role model and feature map', () => {
  it('defines the three selectable roles and validates persisted values', () => {
    expect(USER_ROLES).toEqual(['STUDENT', 'EMPLOYEE', 'COURIER']);
    expect(USER_ROLES.every(isUserRole)).toBe(true);
    expect(isUserRole('ADMIN')).toBe(false);
    expect(isUserRole(null)).toBe(false);
  });

  it.each(USER_ROLES)('maps %s to a role-specific home', (role) => {
    const features = getRoleFeatures(role);
    expect(features).toEqual(ROLE_FEATURES[role]);
    expect(features?.homeTitle).toMatch(new RegExp(role === 'COURIER' ? 'Courier' : role === 'EMPLOYEE' ? 'Employee' : 'Student'));
    expect(features?.highlights.length).toBeGreaterThan(0);
  });

  it('has no feature map for a missing role', () => {
    expect(getRoleFeatures(null)).toBeNull();
  });
});
