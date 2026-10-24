import React, { useState } from 'react';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';
import { apiClient } from '../shared/apiClient';


interface StoreProfile {
  name: string;
  description: string;
  logoUrl: string;
  openingTime: string;
  closingTime: string;
  isOpen: boolean;
}

interface SavedStore {
  id: string;
  name: string;
  description?: string;
  hostStudentId: string;
  hostName: string;
  vendorOrigin: string;
  defaultConvenienceFee: number;
  markupPercentage: number;
  isActive: boolean;
}

export const StoreBuilder: React.FC = () => {
  const [profile, setProfile] = useState<StoreProfile>({
    name: '',
    description: '',
    logoUrl: '',
    openingTime: '08:00',
    closingTime: '17:00',
    isOpen: true,
  });

  const [savedProfile, setSavedProfile] =
    useState<StoreProfile | null>(null);

  const [showPreview, setShowPreview] = useState(false);

  const updateProfile = (
    field: keyof StoreProfile,
    value: string | boolean
  ) => {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const storeSlug = profile.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const storeUrl = storeSlug
    ? `${window.location.origin}/store/${storeSlug}`
    : '';

  const handleSave = async () => {
  if (!profile.name.trim()) {
    alert('Please enter your store name.');
    return;
  }

  const storeData = {
    name: profile.name.trim(),
    description: profile.description,
    hostStudentId: 'TEMP-STUDENT-ID',
    hostName: 'MSU Student',
    vendorOrigin: 'MSU Main Campus',
    defaultConvenienceFee: 35,
    markupPercentage: 10,
  };

  const response = await apiClient.post<SavedStore>(
    '/stores',
    storeData
  );

  if (!response.success || !response.data) {
    alert(`Failed to save store: ${response.error || 'Unknown error'}`);
    return;
  }

  setSavedProfile({ ...profile });
  alert('Store profile saved successfully!');
};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Create Your Virtual Store
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Set up your store so MSU students can discover your products.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              Store Information
            </h2>

            <div>
              <label className="block text-sm font-medium mb-1">
                Store Name *
              </label>
              <input
                className="w-full border rounded-md p-2"
                value={profile.name}
                onChange={(e) =>
                  updateProfile('name', e.target.value)
                }
                placeholder="e.g. Amina's Campus Store"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Store Description
              </label>
              <textarea
                className="w-full border rounded-md p-2"
                rows={3}
                value={profile.description}
                onChange={(e) =>
                  updateProfile('description', e.target.value)
                }
                placeholder="Describe your products and services..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Logo Image URL
              </label>
              <input
                className="w-full border rounded-md p-2"
                value={profile.logoUrl}
                onChange={(e) =>
                  updateProfile('logoUrl', e.target.value)
                }
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-slate-500 mt-1">
                Enter a publicly accessible image URL.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Opens At
                </label>
                <input
                  type="time"
                  className="w-full border rounded-md p-2"
                  value={profile.openingTime}
                  onChange={(e) =>
                    updateProfile('openingTime', e.target.value)
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Closes At
                </label>
                <input
                  type="time"
                  className="w-full border rounded-md p-2"
                  value={profile.closingTime}
                  onChange={(e) =>
                    updateProfile('closingTime', e.target.value)
                  }
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={profile.isOpen}
                onChange={(e) =>
                  updateProfile('isOpen', e.target.checked)
                }
              />
              Store is currently open
            </label>

            <div>
              <label className="block text-sm font-medium mb-1">
                Generated Store URL
              </label>
              <input
                className="w-full border rounded-md p-2 bg-slate-50"
                readOnly
                value={storeUrl}
                placeholder="Enter a store name first"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={handleSave}
              >
                Save Store Profile
              </Button>

              <Button
                variant="ghost"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? 'Hide Preview' : 'Preview Store'}
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold mb-4">
            Store Preview
          </h2>

          {showPreview ? (
            <div className="space-y-3">
              {profile.logoUrl && (
                <img
                  src={profile.logoUrl}
                  alt="Store logo"
                  className="w-20 h-20 object-contain rounded-md"
                />
              )}

              <h3 className="text-xl font-bold">
                {profile.name || 'Your Store Name'}
              </h3>

              <p className="text-sm text-slate-600">
                {profile.description ||
                  'Your store description will appear here.'}
              </p>

              <p className="text-sm">
                Hours: {profile.openingTime} – {profile.closingTime}
              </p>

              <span
                className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${
                  profile.isOpen
                    ? 'bg-green-100 text-green-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {profile.isOpen ? 'Open' : 'Closed'}
              </span>

              <p className="text-xs text-slate-500 break-all">
                {storeUrl || 'Your store URL will appear here.'}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Click Preview Store to see how your store profile will look.
            </p>
          )}

          {savedProfile && (
            <p className="text-sm text-green-700 mt-4">
              A store profile has been saved in the current session.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};
