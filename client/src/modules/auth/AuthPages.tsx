import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { apiClient } from '../shared/apiClient';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';
import type { UserRole } from '../roles/role';

const inputClassName =
  'mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-msu-maroon focus:outline-none focus:ring-2 focus:ring-msu-maroon/30';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-900">
      <div className="w-full max-w-md">
        <a href="/" className="mb-6 block text-center text-sm font-bold tracking-[0.18em] text-msu-maroon">
          MSU PAKAWIT
        </a>
        <Card className="p-6 sm:p-8">{children}</Card>
      </div>
    </main>
  );
}

interface RegisterPageProps {
  role: UserRole;
  onBack?: () => void;
}

export function RegisterPage({ role, onBack }: RegisterPageProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [requestError, setRequestError] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendError, setResendError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = window.setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!emailPattern.test(email.trim())) errors.email = 'Enter a valid email address.';
    if (!fullName.trim()) errors.fullName = 'Enter your full name.';
    if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (!confirmPassword) errors.confirmPassword = 'Confirm your password.';
    else if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.';
    setFieldErrors(errors);
    setRequestError('');
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    const response = await apiClient.post<{ message: string }>('/auth/register', {
      email: email.trim().toLowerCase(),
      fullName: fullName.trim(),
      password,
      role,
    });
    setIsSubmitting(false);
    if (!response.success) {
      setRequestError(response.error ?? 'Registration could not be completed. Try again.');
      return;
    }
    setSubmittedEmail(email.trim().toLowerCase());
    setCooldown(60);
  }

  async function handleResend() {
    setIsResending(true);
    setResendError('');
    const response = await apiClient.post<{ message: string }>('/auth/resend-verification', {
      email: submittedEmail,
    });
    setIsResending(false);
    if (!response.success) {
      setResendError(response.error ?? 'Could not request another email. Try again.');
      return;
    }
    setCooldown(60);
  }

  if (submittedEmail) {
    return (
      <AuthLayout>
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="mt-3 text-sm text-slate-600">
          If this address can receive registration mail, verification instructions were sent to{' '}
          <strong>{submittedEmail}</strong>.
        </p>
        <div className="mt-6 space-y-3">
          <Button
            type="button"
            className="w-full"
            onClick={handleResend}
            disabled={cooldown > 0 || isResending}
            isLoading={isResending}
          >
            {cooldown > 0 ? `Resend available in ${cooldown}s` : 'Resend verification email'}
          </Button>
          {resendError && <p role="alert" className="text-sm text-rose-700">{resendError}</p>}
          <p className="text-xs text-slate-500">Check your spam folder if the email does not appear.</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-2 text-sm text-slate-600">Verify your email before your account is activated.</p>
      {onBack && (
        <button type="button" onClick={onBack} className="mt-3 text-sm font-semibold text-msu-maroon underline">
          Back to role selection
        </button>
      )}
      <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="register-email" className="text-sm font-medium">Email address</label>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="email"
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
            className={inputClassName}
          />
          {fieldErrors.email && <p id="register-email-error" role="alert" className="mt-1 text-xs text-rose-700">{fieldErrors.email}</p>}
        </div>
        <div>
          <label htmlFor="register-full-name" className="text-sm font-medium">Full name</label>
          <input
            id="register-full-name"
            name="fullName"
            type="text"
            autoComplete="name"
            maxLength={120}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            aria-invalid={Boolean(fieldErrors.fullName)}
            aria-describedby={fieldErrors.fullName ? 'register-full-name-error' : undefined}
            className={inputClassName}
          />
          {fieldErrors.fullName && <p id="register-full-name-error" role="alert" className="mt-1 text-xs text-rose-700">{fieldErrors.fullName}</p>}
        </div>
        <div>
          <label htmlFor="register-password" className="text-sm font-medium">Password</label>
          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? 'register-password-error' : undefined}
            className={inputClassName}
          />
          {fieldErrors.password && <p id="register-password-error" role="alert" className="mt-1 text-xs text-rose-700">{fieldErrors.password}</p>}
        </div>
        <div>
          <label htmlFor="register-confirm-password" className="text-sm font-medium">Confirm password</label>
          <input
            id="register-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            aria-invalid={Boolean(fieldErrors.confirmPassword)}
            aria-describedby={fieldErrors.confirmPassword ? 'register-confirm-password-error' : undefined}
            className={inputClassName}
          />
          {fieldErrors.confirmPassword && <p id="register-confirm-password-error" role="alert" className="mt-1 text-xs text-rose-700">{fieldErrors.confirmPassword}</p>}
        </div>
        {requestError && <p role="alert" className="text-sm text-rose-700">{requestError}</p>}
        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}

function ResendVerificationForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!emailPattern.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    const response = await apiClient.post<{ message: string }>('/auth/resend-verification', {
      email: email.trim().toLowerCase(),
    });
    setIsSubmitting(false);
    if (!response.success) {
      setError(response.error ?? 'Could not request another email. Try again.');
      return;
    }
    setSent(true);
  }

  if (sent) {
    return <p role="status" className="mt-4 text-sm text-slate-600">If a pending registration exists, a fresh email will be sent.</p>;
  }

  return (
    <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
      <label htmlFor="resend-email" className="block text-sm font-medium">Email address</label>
      <input
        id="resend-email"
        name="email"
        type="email"
        autoComplete="email"
        maxLength={254}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        aria-invalid={Boolean(error)}
        className={inputClassName}
      />
      {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      <Button type="submit" className="w-full" isLoading={isSubmitting}>Resend verification email</Button>
    </form>
  );
}

type VerificationState = 'checking' | 'success' | 'expired' | 'invalid' | 'error';

export function VerifyEmailPage() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token'));
  const [state, setState] = useState<VerificationState>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const requestStarted = useRef(false);

  useEffect(() => {
    if (!token) {
      setState('invalid');
      return;
    }
    if (requestStarted.current) return;
    requestStarted.current = true;
    window.history.replaceState(window.history.state, '', '/verify-email');

    void apiClient.post<{ message: string }>('/auth/verify', { token }).then((response) => {
      if (response.success) {
        setState('success');
      } else if (response.code === 'LINK_EXPIRED') {
        setState('expired');
      } else if (response.code === 'INVALID_OR_USED_LINK') {
        setState('invalid');
      } else {
        setErrorMessage(response.error ?? 'Verification could not be completed.');
        setState('error');
      }
    });
  }, [token]);

  return (
    <AuthLayout>
      {state === 'checking' && <p role="status">Verifying your email…</p>}
      {state === 'success' && (
        <>
          <h1 className="text-2xl font-bold">Email verified</h1>
          <p className="mt-3 text-sm text-slate-600">Your account is ready. You can now log in.</p>
          <a href="/login" className="mt-6 inline-block font-semibold text-msu-maroon underline">Log in</a>
        </>
      )}
      {state === 'expired' && (
        <>
          <h1 className="text-2xl font-bold">Verification link expired</h1>
          <p className="mt-3 text-sm text-slate-600">Request a fresh verification email to continue.</p>
          <ResendVerificationForm />
        </>
      )}
      {state === 'invalid' && (
        <>
          <h1 className="text-2xl font-bold">Link is invalid or already used</h1>
          <p className="mt-3 text-sm text-slate-600">Register again to request a new verification email.</p>
          <a href="/register" className="mt-6 inline-block font-semibold text-msu-maroon underline">Create an account</a>
        </>
      )}
      {state === 'error' && (
        <>
          <h1 className="text-2xl font-bold">Could not verify your email</h1>
          <p role="alert" className="mt-3 text-sm text-rose-700">{errorMessage}</p>
        </>
      )}
    </AuthLayout>
  );
}
