import React, { FormEvent, useEffect, useRef, useState } from 'react';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { apiClient } from '../shared/apiClient';
import type { ApiResponse } from '../shared/types';

interface RegistrationPageProps {
  verificationToken: string | null;
  onBack: () => void;
}

interface AuthMessage {
  message: string;
}

interface RegistrationForm {
  msuIdNumber: string;
  username: string;
  fullName: string;
  email: string;
  password: string;
}

const emptyForm: RegistrationForm = {
  msuIdNumber: '',
  username: '',
  fullName: '',
  email: '',
  password: '',
};

export const RegistrationPage: React.FC<RegistrationPageProps> = ({ verificationToken, onBack }) => {
  const [form, setForm] = useState<RegistrationForm>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [hasAttemptedRegistration, setHasAttemptedRegistration] = useState(false);
  const [registrationSucceeded, setRegistrationSucceeded] = useState(false);
  const verificationRequest = useRef<{
    token: string;
    request: Promise<ApiResponse<AuthMessage>>;
  } | null>(null);

  useEffect(() => {
    if (!verificationToken) return;

    let isCurrent = true;
    if (verificationRequest.current?.token !== verificationToken) {
      verificationRequest.current = {
        token: verificationToken,
        request: apiClient.post<AuthMessage>('/auth/verify-email', { token: verificationToken }),
      };
    }
    verificationRequest.current.request.then((response) => {
      if (!isCurrent) return;
      setMessage(response.data?.message ?? response.error ?? 'Unable to verify this email address.');
      setIsVerified(response.success);
      setVerificationComplete(true);
    });

    return () => {
      isCurrent = false;
    };
  }, [verificationToken]);

  const updateField = (field: keyof RegistrationForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    const response = await apiClient.post<AuthMessage>('/auth/register', form);
    setMessage(response.data?.message ?? response.error ?? 'Registration failed. Please try again.');
    setHasAttemptedRegistration(true);
    setRegistrationSucceeded(response.success);
    setIsSubmitting(false);
  };

  const handleResend = async () => {
    const response = await apiClient.post<AuthMessage>('/auth/resend-verification', { email: form.email });
    setMessage(response.data?.message ?? response.error ?? 'Unable to resend the verification email.');
  };

  return (
    <main className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-10">
      <Card className="p-6 sm:p-8">
        {verificationToken ? (
          <div className="space-y-4 text-center" aria-live="polite">
            <h1 className="text-2xl font-bold text-slate-900">
              {isVerified ? 'Email verified' : verificationComplete ? 'Unable to verify email' : 'Verifying your email'}
            </h1>
            <p className="text-sm text-slate-600">{message || 'Please wait while we check your verification link.'}</p>
            {message && (
              <Button type="button" variant="outline" onClick={onBack}>
                Back to Pakawit
              </Button>
            )}
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
            <p className="mt-2 text-sm text-slate-600">
              Enter your account details. We’ll email you a link to verify your address before sign-in.
            </p>

            {message && (
              <p
                className={`mt-4 rounded-lg p-3 text-sm ${
                  registrationSucceeded ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'
                }`}
                role="status"
              >
                {message}
              </p>
            )}
            {hasAttemptedRegistration && (
              <button
                type="button"
                onClick={handleResend}
                className="mt-3 text-sm font-medium text-msu-maroon underline"
              >
                Resend verification email
              </button>
            )}

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-slate-700">
                Full name
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  autoComplete="name"
                  maxLength={120}
                  required
                  value={form.fullName}
                  onChange={updateField('fullName')}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                MSU ID number
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  autoComplete="off"
                  maxLength={64}
                  required
                  value={form.msuIdNumber}
                  onChange={updateField('msuIdNumber')}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Username
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  autoComplete="username"
                  minLength={3}
                  maxLength={32}
                  pattern="[a-zA-Z0-9._-]+"
                  required
                  value={form.username}
                  onChange={updateField('username')}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Email
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                  value={form.email}
                  onChange={updateField('email')}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Password
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                  value={form.password}
                  onChange={updateField('password')}
                />
                <span className="mt-1 block text-xs font-normal text-slate-500">Use at least 12 characters.</span>
              </label>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="submit" isLoading={isSubmitting}>
                  Register
                </Button>
                <Button type="button" variant="ghost" onClick={onBack}>
                  Back to Pakawit
                </Button>
              </div>
            </form>
          </>
        )}
      </Card>
    </main>
  );
};
