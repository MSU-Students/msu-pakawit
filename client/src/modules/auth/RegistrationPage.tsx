import React, { useState } from 'react';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';
import { isUserRole, USER_ROLES, USER_ROLE_LABELS, type UserRole, VERIFIED_PROFILE_KEY } from './user-role';

interface RegistrationPageProps {
  verificationToken?: string;
}

interface RegistrationForm {
  fullName: string;
  email: string;
  username: string;
  msuIdNumber: string;
  password: string;
  role: UserRole;
}

const initialForm: RegistrationForm = {
  fullName: '',
  email: '',
  username: '',
  msuIdNumber: '',
  password: '',
  role: 'STUDENT',
};

export const RegistrationPage: React.FC<RegistrationPageProps> = ({ verificationToken }) => {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationSent, setRegistrationSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verifiedRole, setVerifiedRole] = useState<UserRole | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(', ') : result.message);
      setMessage(result.message);
      setRegistrationSent(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!verificationToken) return;
    setError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(', ') : result.message);
      if (!result.user || !USER_ROLES.includes(result.user.role)) {
        throw new Error('Email verification returned an invalid user profile.');
      }
      localStorage.setItem(VERIFIED_PROFILE_KEY, JSON.stringify(result.user));
      setVerifiedRole(result.user.role);
      setMessage(result.message);
      setVerified(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Email verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-12">
      <Card className="mx-auto max-w-lg p-6 sm:p-8">
        <a href="/" className="text-sm font-semibold text-msu-maroon hover:underline">
          MSU Pakawit
        </a>

        {verificationToken ? (
          <>
            <h1 className="mt-5 text-2xl font-bold text-slate-900">Verify your email</h1>
            <p className="mt-2 text-sm text-slate-600">
              Confirm your email address to finish creating your MSU Pakawit account.
            </p>
            {message && (
              <div role="status" className="mt-5 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                <p>{message}</p>
                {verifiedRole && <p className="mt-2 font-semibold">Your role: {USER_ROLE_LABELS[verifiedRole]}</p>}
              </div>
            )}
            {error && <p role="alert" className="mt-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            {!verified && (
              <form onSubmit={verifyEmail} className="mt-6">
                <Button type="submit" isLoading={isSubmitting}>Verify email</Button>
              </form>
            )}
            {verified && <a href="/" className="mt-5 inline-block text-sm font-semibold text-msu-maroon hover:underline">Continue to MSU Pakawit</a>}
          </>
        ) : registrationSent ? (
          <>
            <h1 className="mt-5 text-2xl font-bold text-slate-900">Check your email</h1>
            <p role="status" className="mt-3 text-sm text-slate-600">{message}</p>
            <p className="mt-2 text-sm text-slate-600">Your account will be created after you verify your email.</p>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-2xl font-bold text-slate-900">Create your account</h1>
            <p className="mt-2 text-sm text-slate-600">Register with your MSU details. We’ll email you a link to verify your address.</p>
            {error && <p role="alert" className="mt-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Full name
                <input required maxLength={120} autoComplete="name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Email
                <input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Username
                <input required minLength={3} maxLength={32} autoComplete="username" pattern="[A-Za-z0-9._-]+" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                MSU ID number
                <input required maxLength={64} value={form.msuIdNumber} onChange={(event) => setForm({ ...form, msuIdNumber: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Account role
                <select
                  required
                  value={form.role}
                  onChange={(event) => {
                    if (isUserRole(event.target.value)) setForm({ ...form, role: event.target.value });
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  {USER_ROLES.map((role) => <option key={role} value={role}>{USER_ROLE_LABELS[role]}</option>)}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Password
                <input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
              </label>
              <Button type="submit" isLoading={isSubmitting}>Register</Button>
            </form>
          </>
        )}
      </Card>
    </main>
  );
};
