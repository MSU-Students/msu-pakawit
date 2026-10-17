import React, { useEffect, useState } from 'react';
import { Badge } from '../shared/Badge';
import { Card } from '../shared/Card';
import { apiClient } from '../shared/apiClient';

export interface UserProfileData {
  id: string;
  fullName: string;
  email: string;
  role: string;
  phone?: string | null;
  alternativeEmail?: string | null;
}

export interface UserProfileView {
  fullName: string;
  email: string;
  role: string;
  phone: string;
  alternativeEmail: string;
}

export const mapUserProfile = (profile: UserProfileData): UserProfileView => ({
  fullName: profile.fullName,
  email: profile.email,
  role: profile.role
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' '),
  phone: profile.phone?.trim() || 'Not provided',
  alternativeEmail: profile.alternativeEmail?.trim() || 'Not provided',
});

export const UserProfile: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const [profile, setProfile] = useState<UserProfileView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const accessToken = window.localStorage.getItem('accessToken');

    if (!accessToken) {
      setError('Sign in to view your profile.');
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    apiClient.get<UserProfileData>('/users/me', accessToken).then((response) => {
      if (!isMounted) return;
      if (!response.success || !response.data) {
        setError(response.error || 'Unable to load your profile.');
      } else {
        setProfile(mapUserProfile(response.data));
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section aria-labelledby="profile-heading" className="space-y-4">
      <div>
        <h2 id="profile-heading" className="text-xl font-bold text-slate-900">
          {compact ? 'Account overview' : 'Your Profile'}
        </h2>
        {!compact && (
          <p className="text-sm text-slate-500">Your account information and contact details.</p>
        )}
      </div>

      {isLoading && (
        <p role="status" className="text-sm text-slate-500">Loading profile…</p>
      )}

      {error && (
        <Card>
          <p role="alert" className="text-sm text-rose-700">{error}</p>
        </Card>
      )}

      {profile && (
        <Card>
          <dl className="grid gap-5 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Full name</dt>
              <dd className="mt-1 font-medium text-slate-900">{profile.fullName}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</dt>
              <dd className="mt-1">
                <Badge variant="info">{profile.role}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Primary email <span className="normal-case tracking-normal">(read-only)</span>
              </dt>
              <dd className="mt-1 font-medium text-slate-900">{profile.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</dt>
              <dd className="mt-1 font-medium text-slate-900">{profile.phone}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Alternative email</dt>
              <dd className="mt-1 font-medium text-slate-900">{profile.alternativeEmail}</dd>
            </div>
          </dl>
        </Card>
      )}
    </section>
  );
};
