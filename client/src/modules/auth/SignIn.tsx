import React, { useState } from 'react';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';
import { apiClient } from '../shared/apiClient';

interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: string;
    username: string;
    fullName: string;
    role: string;
  };
}

interface SignInProps {
  onSignedIn: (accessToken: string) => void;
}

export const SignIn: React.FC<SignInProps> = ({ onSignedIn }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', { username, password });
      const accessToken = response.data?.accessToken;
      if (!response.success || !accessToken) {
        setError(response.error || 'Sign-in failed. Check your username and password.');
        return;
      }

      window.localStorage.setItem('accessToken', accessToken);
      onSignedIn(accessToken);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <div className="mx-auto max-w-md">
        <h3 id="signin-dialog-title" className="text-lg font-semibold text-slate-900">Sign in</h3>
        <p className="mt-1 text-sm text-slate-600">Use your MSU Pakawit username and password.</p>
        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="signin-username" className="mb-1 block text-sm font-medium text-slate-700">
              Username
            </label>
            <input
              id="signin-username"
              name="username"
              type="text"
              autoComplete="username"
              required
              minLength={3}
              maxLength={32}
              pattern="[A-Za-z0-9._-]+"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-msu-maroon focus:outline-none focus:ring-2 focus:ring-msu-maroon/20"
            />
          </div>
          <div>
            <label htmlFor="signin-password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="signin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-msu-maroon focus:outline-none focus:ring-2 focus:ring-msu-maroon/20"
            />
          </div>
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          <Button type="submit" className="w-full" isLoading={isLoading}>
            {isLoading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </Card>
  );
};
