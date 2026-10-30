import React, { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, Package } from 'lucide-react';
import { apiClient } from '../shared/apiClient';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';
import { RunnerStatusBadge } from './RunnerStatusBadge';
import type { ErrandStatus } from './types';
import { storefrontApi } from '../storefront/storefrontApi';

interface ErrandDetailRecord {
  id: string;
  status: ErrandStatus;
  dropZone: string;
  createdAt: string;
  updatedAt: string;
}

interface ErrandDetailsProps {
  errandId: string;
  onBack: () => void;
}

export const ErrandDetails: React.FC<ErrandDetailsProps> = ({ errandId, onBack }) => {
  const [errand, setErrand] = useState<ErrandDetailRecord | null>(null);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  const loadErrand = () => apiClient.get<ErrandDetailRecord>(`/errands/${encodeURIComponent(errandId)}`)
    .then((response) => {
      if (!response.success || !response.data) {
        setError(response.error || 'Could not load this errand.');
        return;
      }
      setErrand(response.data);
      setError('');
    })
    .catch((cause: Error) => setError(cause.message));

  useEffect(() => {
    let active = true;
    setErrand(null);
    setError('');
    apiClient.get<ErrandDetailRecord>(`/errands/${encodeURIComponent(errandId)}`)
      .then((response) => {
        if (!active) return;
        if (!response.success || !response.data) {
          setError(response.error || 'Could not load this errand.');
          return;
        }
        setErrand(response.data);
      })
      .catch((cause: Error) => active && setError(cause.message));
    return () => { active = false; };
  }, [errandId]);

  const signInToView = async (event: FormEvent) => {
    event.preventDefault();
    setSigningIn(true);
    setError('');
    const response = await storefrontApi.login(username, password);
    setSigningIn(false);
    if (!response.success || !response.data) {
      setError(response.error || 'Sign-in failed.');
      return;
    }
    try {
      sessionStorage.setItem('pakawitAccessToken', response.data.accessToken);
    } catch {
      setError('Your browser could not store the sign-in session. Enable session storage and try again.');
      return;
    }
    apiClient.setAccessToken(response.data.accessToken);
    setPassword('');
    await loadErrand();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>Back to errands</Button>
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Errand details</p>
            <h2 className="mt-1 break-all font-mono text-lg font-bold text-slate-900">#{errandId}</h2>
          </div>
          {errand && <RunnerStatusBadge status={errand.status} />}
        </div>
        {error ? (
          <div className="mt-4 space-y-3">
            <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>
            {error.includes('401') && (
              <form className="grid gap-3 sm:grid-cols-2" onSubmit={signInToView}>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Username
                  <input autoComplete="username" required className="rounded-lg border border-slate-300 px-3 py-2" value={username} onChange={(event) => setUsername(event.target.value)} />
                </label>
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  Password
                  <input type="password" autoComplete="current-password" required className="rounded-lg border border-slate-300 px-3 py-2" value={password} onChange={(event) => setPassword(event.target.value)} />
                </label>
                <div className="sm:col-span-2">
                  <Button type="submit" isLoading={signingIn}>Sign in to view this errand</Button>
                </div>
              </form>
            )}
          </div>
        ) : errand ? (
          <dl className="mt-5 grid gap-4 border-t border-slate-200 pt-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current status</dt>
              <dd className="mt-1 text-sm font-medium text-slate-900">{errand.status}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Drop zone</dt>
              <dd className="mt-1 text-sm text-slate-900">{errand.dropZone}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last updated</dt>
              <dd className="mt-1 text-sm text-slate-900">{new Date(errand.updatedAt).toLocaleString()}</dd>
            </div>
          </dl>
        ) : (
          <p role="status" className="mt-5 flex items-center gap-2 text-sm text-slate-500"><Package className="h-4 w-4" />Loading errand details…</p>
        )}
      </Card>
    </div>
  );
};
