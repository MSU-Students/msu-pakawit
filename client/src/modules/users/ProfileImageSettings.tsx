import React, { useRef, useState } from 'react';
import { ImagePlus, UserRound } from 'lucide-react';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

interface ProfileImageSettingsProps {
  image: string | null;
  loadError?: string | null;
  onSave: (image: string) => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}

export const ProfileImageSettings: React.FC<ProfileImageSettingsProps> = ({
  image,
  loadError,
  onSave,
  onDelete,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    setError(null);
    setStatus(null);

    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setPreview(null);
      setError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setPreview(null);
      setError('Choose an image smaller than 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setPreview(reader.result);
      else setError('This image could not be previewed. Choose another file.');
    };
    reader.onerror = () => setError('This image could not be read. Choose another file.');
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!preview) return;
    setError(null);
    setStatus(null);

    try {
      await onSave(preview);
      setPreview(null);
      setStatus('Profile image saved in this browser for the local demo profile. It is not linked to an authenticated account or synced.');
    } catch {
      setError('Could not save the profile image to this browser. Please try again.');
    }
  };

  const handleDelete = async () => {
    if (!image || !window.confirm('Delete the saved profile picture?')) return;
    setError(null);
    setStatus(null);

    try {
      await onDelete();
      setStatus('Profile picture deleted from this browser for the local demo profile.');
    } catch {
      setError('Could not delete the profile picture from this browser. Please try again.');
    }
  };

  return (
    <section className="box-border mx-auto w-full min-w-0 max-w-3xl space-y-5" aria-labelledby="profile-heading">
      <div>
        <h1 id="profile-heading" className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-600">Manage your profile picture.</p>
      </div>

      <Card className="box-border w-full min-w-0 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Profile picture</h2>
          <p className="mt-1 text-sm text-slate-600">JPEG, PNG, or WebP. Maximum file size: 5 MB.</p>
          <p className="mt-1 text-sm text-slate-600">
            This image is stored only in this browser for the local demo profile; it is not linked to an authenticated account or synced.
          </p>
        </div>

        <div className="grid w-full min-w-0 grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="min-w-0 space-y-3">
            <h3 className="text-sm font-medium text-slate-700">Current picture</h3>
            <div className="box-border flex h-44 w-full min-w-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
              {image ? (
                <img src={image} alt="Current profile" className="h-32 w-32 rounded-full object-cover" />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-slate-200 text-slate-500" aria-label="Default avatar">
                  <UserRound className="h-16 w-16" aria-hidden="true" />
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-3">
            <h3 className="text-sm font-medium text-slate-700">Preview</h3>
            <div className="box-border flex h-44 w-full min-w-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50">
              {preview ? (
                <img src={preview} alt="Profile picture preview" className="h-32 w-32 rounded-full object-cover" />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full bg-slate-200 text-slate-500" aria-label="No image preview">
                  <ImagePlus className="h-12 w-12" aria-hidden="true" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            aria-label="Choose profile image"
            className="sr-only"
          />
          <Button
            type="button"
            variant="outline"
            leftIcon={<ImagePlus className="h-4 w-4" />}
            onClick={() => fileInputRef.current?.click()}
          >
            {image || preview ? 'Choose another image' : 'Choose image'}
          </Button>
          <Button type="button" onClick={handleSave} disabled={!preview}>
            Save profile image
          </Button>
          <Button type="button" variant="outline" onClick={handleDelete} disabled={!image}>
            Delete Picture
          </Button>
        </div>

        {loadError && <p role="alert" className="text-sm text-rose-700">{loadError}</p>}
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        {status && <p role="status" className="text-sm text-emerald-700">{status}</p>}
      </Card>
    </section>
  );
};