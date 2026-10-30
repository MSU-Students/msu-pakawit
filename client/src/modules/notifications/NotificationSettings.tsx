import React, { FormEvent, useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';
import { apiClient } from '../shared/apiClient';
import { storefrontApi } from '../storefront/storefrontApi';
import type { NotificationPreferences } from './notificationsApi';
import { notificationsApi } from './notificationsApi';

const decodeVapidKey = (key: string): Uint8Array => {
  const padded = `${key}${'='.repeat((4 - key.length % 4) % 4)}`;
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
};

const getSavedToken = (): string => {
  try {
    return sessionStorage.getItem('pakawitAccessToken') ?? '';
  } catch {
    return '';
  }
};

export const NotificationSettings: React.FC = () => {
  const [accessToken, setAccessToken] = useState(getSavedToken);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingPreference, setSavingPreference] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    apiClient.setAccessToken(accessToken || null);
    if (!accessToken) {
      setPreferences(null);
      setSubscription(null);
      return;
    }
    let active = true;
    setLoading(true);
    Promise.all([
      notificationsApi.getPreferences(),
      navigator.serviceWorker?.getRegistration().then((registration) => registration?.pushManager.getSubscription() ?? null)
        ?? Promise.resolve(null),
    ]).then(([response, currentSubscription]) => {
      if (!active) return;
      if (!response.success || !response.data) {
        setError(response.error || 'Could not load notification preferences.');
        return;
      }
      setPreferences(response.data);
      setSubscription(currentSubscription);
    }).catch((cause: Error) => {
      if (active) setError(cause.message || 'Could not load notification settings.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [accessToken]);

  const saveLogin = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    const result = await storefrontApi.login(username, password);
    setLoading(false);
    if (!result.success || !result.data) {
      setError(result.error || 'Sign-in failed.');
      return;
    }
    try {
      sessionStorage.setItem('pakawitAccessToken', result.data.accessToken);
    } catch {
      setError('Your browser could not store the sign-in session. Enable session storage and try again.');
      return;
    }
    setPassword('');
    setAccessToken(result.data.accessToken);
  };

  const requestPermissionAndSubscribe = async () => {
    setError('');
    setMessage('');
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setError('This browser does not support Web Push notifications.');
      return;
    }
    if (!window.isSecureContext) {
      setError('Web Push requires a secure connection (HTTPS or localhost).');
      return;
    }
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setMessage(permission === 'denied'
          ? 'Notifications are blocked. Change this site’s permission in your browser settings to enable them.'
          : 'Notification permission was not granted. You can enable it here whenever you are ready.');
        return;
      }
      const keyResponse = await notificationsApi.getVapidPublicKey();
      if (!keyResponse.success || !keyResponse.data?.publicKey) {
        throw new Error(keyResponse.error || 'The push notification server is not configured.');
      }
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      const readyRegistration = await navigator.serviceWorker.ready;
      const activeRegistration = readyRegistration.active ? readyRegistration : registration;
      const currentSubscription = await activeRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(keyResponse.data.publicKey) as BufferSource,
      });
      const result = await notificationsApi.subscribe(currentSubscription.toJSON());
      if (!result.success) {
        await currentSubscription.unsubscribe();
        throw new Error(result.error || 'Could not save this browser subscription.');
      }
      setSubscription(currentSubscription);
      setMessage('Push notifications are enabled on this device.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not enable push notifications.');
    } finally {
      setLoading(false);
    }
  };

  const disableNotifications = async () => {
    if (!subscription) return;
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const result = await notificationsApi.unsubscribe(subscription.endpoint);
      if (!result.success) throw new Error(result.error || 'Could not remove this device from your account.');
      if (!await subscription.unsubscribe()) throw new Error('The browser could not unsubscribe this device.');
      setSubscription(null);
      setMessage('Push notifications are disabled on this device.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not disable push notifications.');
    } finally {
      setLoading(false);
    }
  };

  const savePreference = async (key: keyof NotificationPreferences, checked: boolean) => {
    if (!preferences) return;
    setError('');
    setMessage('');
    setSavingPreference(true);
    const response = await notificationsApi.updatePreferences({ [key]: checked });
    setSavingPreference(false);
    if (!response.success || !response.data) {
      setError(response.error || 'Could not save notification preferences.');
      return;
    }
    setPreferences(response.data);
    setMessage('Notification preferences saved.');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <Bell className="h-5 w-5 text-msu-maroon" />
          Notification preferences
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Choose which errand updates you receive. Browser permission is requested only after you choose to enable notifications.
        </p>
      </div>

      {!accessToken ? (
        <Card>
          <h3 className="font-semibold text-slate-900">Sign in to manage notifications</h3>
          <p className="mt-1 text-sm text-slate-600">Use your Pakawit account to attach this browser to your notification preferences.</p>
          <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={saveLogin}>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Username
              <input autoComplete="username" required className="rounded-lg border border-slate-300 px-3 py-2" value={username} onChange={(event) => setUsername(event.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-700">
              Password
              <input type="password" autoComplete="current-password" required className="rounded-lg border border-slate-300 px-3 py-2" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <div className="sm:col-span-2">
              <Button type="submit" isLoading={loading}>Sign in</Button>
            </div>
          </form>
        </Card>
      ) : (
        <>
          <Card className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">This device</h3>
                <p className="text-sm text-slate-600">
                  {subscription ? 'Push notifications are active for this browser.' : 'Push notifications are not enabled for this browser.'}
                </p>
              </div>
              {subscription ? (
                <Button variant="outline" leftIcon={<BellOff className="h-4 w-4" />} disabled={loading} onClick={() => void disableNotifications()}>
                  Turn off on this device
                </Button>
              ) : (
                <Button leftIcon={<Bell className="h-4 w-4" />} isLoading={loading} onClick={() => void requestPermissionAndSubscribe()}>
                  Enable notifications
                </Button>
              )}
            </div>
            {preferences && (
              <fieldset disabled={savingPreference || loading} className="space-y-3 border-t border-slate-200 pt-4">
                <legend className="sr-only">Notification types</legend>
                <label className="flex items-start gap-3 text-sm text-slate-700">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-msu-maroon" checked={preferences.statusChanges} onChange={(event) => void savePreference('statusChanges', event.target.checked)} />
                  <span><strong className="block">Errand status changes</strong>Updates when an order is accepted, purchased, delivering, completed, or cancelled.</span>
                </label>
                <label className="flex items-start gap-3 text-sm text-slate-700">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-msu-maroon" checked={preferences.assignments} onChange={(event) => void savePreference('assignments', event.target.checked)} />
                  <span><strong className="block">Courier assignments</strong>Updates when an errand is assigned to you.</span>
                </label>
              </fieldset>
            )}
            <button type="button" className="text-left text-xs text-slate-500 underline hover:text-slate-800" onClick={() => {
              try { sessionStorage.removeItem('pakawitAccessToken'); } catch { setError('Could not clear the sign-in session from browser storage.'); return; }
              apiClient.setAccessToken(null);
              setAccessToken('');
            }}>Sign out</button>
          </Card>
        </>
      )}
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {message && <p role="status" aria-live="polite" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {loading && accessToken && <p role="status" className="text-sm text-slate-500">Loading notification preferences…</p>}
    </div>
  );
};
