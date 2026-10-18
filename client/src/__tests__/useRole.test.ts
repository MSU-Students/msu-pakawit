import { act, renderHook, waitFor } from '@testing-library/react';
import { db } from '../modules/offline/db';
import { useRole } from '../modules/roles/useRole';

jest.mock('../modules/offline/db', () => ({
  db: {
    getCurrentUserProfile: jest.fn(),
    saveCurrentUserRole: jest.fn(),
  },
}));

const getProfile = jest.mocked(db.getCurrentUserProfile);
const persistRole = jest.mocked(db.saveCurrentUserRole);

describe('useRole', () => {
  beforeEach(() => {
    getProfile.mockReset().mockResolvedValue(undefined);
    persistRole.mockReset().mockResolvedValue(undefined);
  });

  it('loads a previously saved role', async () => {
    getProfile.mockResolvedValueOnce({ id: 'current', role: 'COURIER' });
    const { result } = renderHook(() => useRole());

    await waitFor(() => expect(result.current.role).toBe('COURIER'));
    expect(result.current.isLoading).toBe(false);
  });

  it('surfaces a save failure and allows retrying the save', async () => {
    persistRole.mockRejectedValueOnce(new Error('IndexedDB unavailable'));
    const { result } = renderHook(() => useRole());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => {
      await expect(result.current.saveRole('EMPLOYEE')).resolves.toBe(false);
    });
    expect(result.current.error).toBe('We could not save your role. Please try again.');

    await act(async () => {
      await expect(result.current.saveRole('EMPLOYEE')).resolves.toBe(true);
    });
    expect(result.current.role).toBe('EMPLOYEE');
    expect(result.current.error).toBeNull();
    expect(persistRole).toHaveBeenCalledTimes(2);
  });
});
