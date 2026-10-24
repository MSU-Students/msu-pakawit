import React, { useRef, useState } from 'react';
import { ROLE_OPTIONS, type SelectableRole } from '../shared/RoleSelector';
import { isSelectableRole } from '../shared/rolePreference';
import { Button } from '../shared/Button';
import { apiClient } from '../shared/apiClient';

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type OnboardingStep = 'details' | 'role' | 'review' | 'success';

interface AccountDetails {
  msuIdNumber: string;
  fullName: string;
  username: string;
  email: string;
  password: string;
}

const EMPTY_DETAILS: AccountDetails = {
  msuIdNumber: '',
  fullName: '',
  username: '',
  email: '',
  password: '',
};

export interface OnboardingRegisterProps {
  onClose: () => void;
  onGoToSignIn: (username?: string) => void;
}

const validateDetails = (details: AccountDetails): Partial<Record<keyof AccountDetails, string>> => {
  const errors: Partial<Record<keyof AccountDetails, string>> = {};
  if (!details.msuIdNumber.trim()) errors.msuIdNumber = 'Enter your MSU ID number.';
  if (!details.fullName.trim()) errors.fullName = 'Enter your full name.';
  if (!USERNAME_PATTERN.test(details.username.trim())) {
    errors.username = 'Username must be 3-32 characters using letters, numbers, dots, underscores, or hyphens.';
  }
  if (!EMAIL_PATTERN.test(details.email.trim())) errors.email = 'Enter a valid email address.';
  if (details.password.length < 12 || details.password.length > 128) {
    errors.password = 'Password must be between 12 and 128 characters.';
  }
  return errors;
};

const roleLabel = (role: SelectableRole) =>
  ROLE_OPTIONS.find((option) => option.role === role)?.label ?? role;

export const OnboardingRegister: React.FC<OnboardingRegisterProps> = ({ onClose, onGoToSignIn }) => {
  const [step, setStep] = useState<OnboardingStep>('details');
  const [details, setDetails] = useState<AccountDetails>(EMPTY_DETAILS);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof AccountDetails, string>>>({});
  const [selectedRole, setSelectedRole] = useState<SelectableRole | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const updateField = (field: keyof AccountDetails, value: string) => {
    setDetails((current) => ({ ...current, [field]: value }));
  };

  const handleDetailsContinue = (event: React.FormEvent) => {
    event.preventDefault();
    const errors = validateDetails(details);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setStep('role');
  };

  const handleRoleContinue = () => {
    if (!isSelectableRole(selectedRole)) {
      setRoleError('Select Student, Employee / Faculty, or Courier Runner to continue.');
      return;
    }
    setRoleError(null);
    setStep('review');
  };

  const handleRegister = async () => {
    if (isSubmittingRef.current) return;
    if (!isSelectableRole(selectedRole)) {
      setRoleError('Select Student, Employee / Faculty, or Courier Runner to continue.');
      setStep('role');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError(null);
    const response = await apiClient.post('/auth/register', {
      msuIdNumber: details.msuIdNumber.trim(),
      fullName: details.fullName.trim(),
      username: details.username.trim().toLowerCase(),
      email: details.email.trim().toLowerCase(),
      password: details.password,
      role: selectedRole,
    });
    isSubmittingRef.current = false;
    setIsSubmitting(false);

    if (!response.success) {
      setSubmitError(response.error || 'Unable to create the account.');
      return;
    }

    setStep('success');
  };

  return (
    <div
      className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
      aria-label="Create an account"
    >
      <div className="bg-gradient-to-r from-msu-maroon to-msu-maroon-dark text-white p-6">
        <p className="text-msu-gold font-bold text-xs tracking-wider uppercase">MSU Pakawit • Onboarding</p>
        <h2 className="text-xl sm:text-2xl font-bold mt-1">Create your account</h2>
        <p className="text-xs sm:text-sm text-red-100/90 mt-1.5">
          {step === 'details' && 'Step 1 of 3: Enter your account details.'}
          {step === 'role' && 'Step 2 of 3: Choose one platform role.'}
          {step === 'review' && 'Step 3 of 3: Review and confirm your selected role.'}
          {step === 'success' && 'Your account is ready. Sign in to continue.'}
        </p>
      </div>

      {step === 'details' && (
        <form onSubmit={handleDetailsContinue} className="p-6 space-y-4" aria-label="Account details">
          <Field
            label="MSU ID number"
            value={details.msuIdNumber}
            onChange={(value) => updateField('msuIdNumber', value)}
            error={fieldErrors.msuIdNumber}
            autoComplete="off"
          />
          <Field
            label="Full name"
            value={details.fullName}
            onChange={(value) => updateField('fullName', value)}
            error={fieldErrors.fullName}
            autoComplete="name"
          />
          <Field
            label="Username"
            value={details.username}
            onChange={(value) => updateField('username', value)}
            error={fieldErrors.username}
            autoComplete="username"
          />
          <Field
            label="Email"
            type="email"
            value={details.email}
            onChange={(value) => updateField('email', value)}
            error={fieldErrors.email}
            autoComplete="email"
          />
          <Field
            label="Password"
            type="password"
            value={details.password}
            onChange={(value) => updateField('password', value)}
            error={fieldErrors.password}
            autoComplete="new-password"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Continue to role selection
            </Button>
          </div>
        </form>
      )}

      {step === 'role' && (
        <div className="p-6 space-y-4">
          <div role="radiogroup" aria-label="Select a platform role" className="space-y-3">
            {ROLE_OPTIONS.map((option) => {
              const isChosen = selectedRole === option.role;
              return (
                <div
                  key={option.role}
                  role="radio"
                  aria-checked={isChosen}
                  tabIndex={0}
                  onClick={() => {
                    setSelectedRole(option.role);
                    setRoleError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === ' ' || event.key === 'Enter') {
                      event.preventDefault();
                      setSelectedRole(option.role);
                      setRoleError(null);
                    }
                  }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-msu-maroon ${
                    isChosen
                      ? 'border-msu-maroon bg-red-50/30 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-bold text-slate-900">{option.label}</p>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">{option.badge}</p>
                  <p className="text-xs text-slate-600 mt-1">{option.description}</p>
                </div>
              );
            })}
          </div>
          {roleError && (
            <p role="alert" className="text-xs text-rose-600">
              {roleError}
            </p>
          )}
          <div className="flex justify-between gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setStep('details')}>
              Back
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={handleRoleContinue}>
              Continue to review
            </Button>
          </div>
        </div>
      )}

      {step === 'review' && selectedRole && (
        <div className="p-6 space-y-4">
          <dl className="space-y-3 text-sm">
            <ReviewItem label="MSU ID number" value={details.msuIdNumber.trim()} />
            <ReviewItem label="Full name" value={details.fullName.trim()} />
            <ReviewItem label="Username" value={details.username.trim().toLowerCase()} />
            <ReviewItem label="Email" value={details.email.trim().toLowerCase()} />
            <ReviewItem label="Password" value="Password is set and hidden." />
            <ReviewItem label="Selected role" value={`${roleLabel(selectedRole)} (${selectedRole})`} />
          </dl>
          {submitError && (
            <p role="alert" className="text-xs text-rose-600">
              {submitError}
            </p>
          )}
          <div className="flex flex-col-reverse sm:flex-row justify-between gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setStep('role')} disabled={isSubmitting}>
              Change role
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              onClick={() => void handleRegister()}
            >
              Create account
            </Button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-700">
            Your {selectedRole ? roleLabel(selectedRole) : 'platform'} account was created. Sign in to start using MSU Pakawit.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={() => onGoToSignIn(details.username)}>
              Sign in
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
}> = ({ label, value, onChange, error, type = 'text', autoComplete }) => {
  const fieldId = label.replace(/\s+/g, '-').toLowerCase();
  const errorId = `${fieldId}-error`;
  return (
    <div>
      <label htmlFor={fieldId} className="block text-xs font-semibold text-slate-700">
        {label}
      </label>
      <input
        id={fieldId}
        type={type}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        minLength={type === 'password' ? 12 : undefined}
        maxLength={type === 'password' ? 128 : undefined}
      />
      {error && (
        <span id={errorId} role="alert" className="mt-1 block text-xs font-medium text-rose-600">
          {error}
        </span>
      )}
    </div>
  );
};

const ReviewItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <dt className="text-xs font-semibold text-slate-500">{label}</dt>
    <dd className="text-slate-900">{value}</dd>
  </div>
);

export default OnboardingRegister;
