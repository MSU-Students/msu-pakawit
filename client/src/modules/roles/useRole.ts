import { useCallback, useEffect, useState } from 'react';
import { db } from '../offline/db';
import { isUserRole, type UserRole } from './role';

export interface RoleState {
  role: UserRole | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  saveRole: (role: UserRole) => Promise<boolean>;
  reload: () => Promise<void>;
}

export function useRole(): RoleState {
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const profile = await db.getCurrentUserProfile();
      setRole(isUserRole(profile?.role) ? profile.role : null);
      setError(null);
    } catch {
      setRole(null);
      setError('We could not load your saved role. Choose a role and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const saveRole = useCallback(async (selectedRole: UserRole): Promise<boolean> => {
    setIsSaving(true);
    try {
      await db.saveCurrentUserRole(selectedRole);
      setRole(selectedRole);
      setError(null);
      return true;
    } catch {
      setError('We could not save your role. Please try again.');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { role, isLoading, isSaving, error, saveRole, reload };
}
