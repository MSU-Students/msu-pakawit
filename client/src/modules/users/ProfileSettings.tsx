import React, { FormEvent, useEffect, useState } from 'react';
import { apiClient, AuthenticatedApiClient } from '../shared/apiClient';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';

type UserRole = 'STUDENT' | 'EMPLOYEE' | 'COURIER' | 'ADMIN';

interface UserProfile {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  msuIdNumber: string;
  isActive: boolean;
}

interface LoginResponse {
  accessToken: string;
  user: Pick<UserProfile, 'id' | 'username' | 'fullName' | 'role'>;
}

const roles: UserRole[] = ['STUDENT', 'EMPLOYEE', 'COURIER', 'ADMIN'];

interface ProfileSettingsProps {
  client?: AuthenticatedApiClient;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ client = apiClient }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('STUDENT');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(client.hasAccessToken);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedUser = users.find((user) => user.id === selectedUserId);

  const loadProfile = async (): Promise<boolean> => {
    const response = await client.get<UserProfile>('/users/me');
    if (!response.success || !response.data) {
      client.setAccessToken(null);
      setProfile(null);
      setError(response.error || 'Unable to load your profile.');
      return false;
    }

    setProfile(response.data);
    setError('');
    if (response.data.role === 'ADMIN') {
      const usersResponse = await client.get<UserProfile[]>('/users');
      if (!usersResponse.success || !usersResponse.data) {
        setError(usersResponse.error || 'Unable to load user accounts.');
        return true;
      }
      setUsers(usersResponse.data);
      setSelectedUserId(response.data.id);
      setSelectedRole(response.data.role);
    }
    return true;
  };

  useEffect(() => {
    if (!client.hasAccessToken) return undefined;
    let cancelled = false;
    setIsLoading(true);
    void loadProfile().finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setNotice('');

    const response = await client.post<LoginResponse>('/auth/login', { username, password });
    if (!response.success || !response.data?.accessToken) {
      setError(response.error || 'Login failed.');
      setIsLoading(false);
      return;
    }

    client.setAccessToken(response.data.accessToken);
    setPassword('');
    const loaded = await loadProfile();
    if (loaded) setNotice('Signed in successfully.');
    setIsLoading(false);
  };

  const handleRoleChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUser || selectedRole === selectedUser.role) return;
    setIsSaving(true);
    setError('');
    setNotice('');

    const response = await client.patch<UserProfile>(`/users/${selectedUser.id}/role`, {
      role: selectedRole,
    });
    if (!response.success || !response.data) {
      setError(response.error || 'Unable to update this user’s role.');
      setIsSaving(false);
      return;
    }

    const updatedUser = response.data;
    setUsers((currentUsers) =>
      currentUsers.map((user) => user.id === updatedUser.id ? updatedUser : user),
    );
    if (profile?.id === updatedUser.id) setProfile(updatedUser);
    setNotice(`Role updated to ${updatedUser.role}.`);
    setIsSaving(false);
  };

  const handleLogout = () => {
    client.setAccessToken(null);
    setProfile(null);
    setUsers([]);
    setSelectedUserId('');
    setNotice('');
    setError('');
  };

  return (
    <section className="mx-auto max-w-3xl space-y-5" aria-labelledby="profile-settings-title">
      <div>
        <h1 id="profile-settings-title" className="text-2xl font-bold text-slate-900">Profile Settings</h1>
        <p className="mt-1 text-sm text-slate-600">View your account details and manage roles if you are an administrator.</p>
      </div>

      {error && <p role="alert" className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}

      {isLoading ? (
        <Card><p className="text-sm text-slate-600">Loading profile…</p></Card>
      ) : profile ? (
        <>
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{profile.fullName}</h2>
                <p className="mt-1 text-sm text-slate-600">{profile.email}</p>
                <p className="mt-1 text-sm text-slate-600">Username: {profile.username}</p>
                <p className="mt-1 text-sm text-slate-600">MSU ID: {profile.msuIdNumber}</p>
                <p className="mt-3 text-sm">
                  Role: <span data-testid="profile-role" className="font-semibold text-msu-maroon">{profile.role}</span>
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleLogout}>Sign out</Button>
            </div>
          </Card>

          {profile.role === 'ADMIN' && (
            <Card>
              <h2 className="text-lg font-semibold text-slate-900">Manage user roles</h2>
              <p className="mt-1 text-sm text-slate-600">Only administrators can change account roles. Every change is recorded.</p>
              <form className="mt-4 space-y-4" onSubmit={handleRoleChange}>
                <label className="block text-sm font-medium text-slate-700">
                  User account
                  <select
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                    value={selectedUserId}
                    onChange={(event) => {
                      const nextUser = users.find((user) => user.id === event.target.value);
                      setSelectedUserId(event.target.value);
                      if (nextUser) setSelectedRole(nextUser.role);
                    }}
                  >
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>{user.fullName} ({user.username})</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Role
                  <select
                    className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                    value={selectedRole}
                    onChange={(event) => setSelectedRole(event.target.value as UserRole)}
                    disabled={!selectedUser}
                  >
                    {roles.map((role) => <option key={role} value={role}>{role}</option>)}
                  </select>
                </label>
                <Button type="submit" isLoading={isSaving} disabled={!selectedUser || selectedRole === selectedUser.role}>
                  Save role
                </Button>
              </form>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">Sign in to your account</h2>
          <form className="mt-4 space-y-4" onSubmit={handleLogin}>
            <label className="block text-sm font-medium text-slate-700">
              Username
              <input
                autoComplete="username"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                autoComplete="current-password"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            <Button type="submit" isLoading={isLoading}>Sign in</Button>
          </form>
        </Card>
      )}
    </section>
  );
};

export default ProfileSettings;
