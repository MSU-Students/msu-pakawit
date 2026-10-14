import React, { useState } from 'react';
import { Store, ImagePlus, Save } from 'lucide-react';
import { Card } from '../shared/Card';
import { Button } from '../shared/Button';

export interface StoreBrandingData {
  name: string;
  description: string;
  logo: File | null;
}

interface StoreBuilderProps {
  initialData?: StoreBrandingData;
  onSave: (data: StoreBrandingData) => void | Promise<void>;
}

export const StoreBuilder: React.FC<StoreBuilderProps> = ({
  initialData,
  onSave,
}) => {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(
    initialData?.description ?? ''
  );
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleLogoChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('The image must be 2 MB or smaller.');
      return;
    }

    setError('');
    setLogo(file);

    const reader = new FileReader();

    reader.onload = () => {
      setLogoPreview(reader.result as string);
    };

    reader.readAsDataURL(file);
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!name.trim()) {
      setError('Please enter a store name.');
      return;
    }

    setError('');
    setIsSaving(true);

    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        logo,
      });
    } catch {
      setError('Unable to submit store information. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">
          Create Your Store
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Add your store information and branding.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-50 p-3">
              <Store className="h-6 w-6 text-msu-maroon" />
            </div>

            <div>
              <h3 className="font-semibold text-slate-900">
                Store Information
              </h3>

              <p className="text-sm text-slate-500">
                Tell customers about your store.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="store-name"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Store Name <span className="text-red-600">*</span>
            </label>

            <input
              id="store-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter your store name"
              maxLength={100}
              required
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-msu-maroon focus:outline-none focus:ring-2 focus:ring-msu-maroon/20"
            />
          </div>

          <div>
            <label
              htmlFor="store-description"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Store Description
            </label>

            <textarea
              id="store-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe your store and what you offer"
              rows={4}
              maxLength={500}
              className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 text-sm focus:border-msu-maroon focus:outline-none focus:ring-2 focus:ring-msu-maroon/20"
            />

            <p className="mt-1 text-right text-xs text-slate-500">
              {description.length}/500 characters
            </p>
          </div>

          <div>
            <label
              htmlFor="store-logo"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Store Logo or Branding Image
            </label>

            <label
              htmlFor="store-logo"
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-6 text-center transition hover:border-msu-maroon"
            >
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Store logo preview"
                  className="mb-3 h-24 w-24 rounded-lg border border-slate-200 object-contain"
                />
              ) : (
                <ImagePlus className="mb-3 h-10 w-10 text-slate-400" />
              )}

              <span className="text-sm font-medium text-slate-700">
                {logo ? logo.name : 'Choose an image'}
              </span>

              <span className="mt-1 text-xs text-slate-500">
                Image files only, maximum 2 MB
              </span>
            </label>

            <input
              id="store-logo"
              type="file"
              accept="image/*"
              onChange={handleLogoChange}
              className="sr-only"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex justify-end border-t border-slate-200 pt-4">
            <Button
              type="submit"
              isLoading={isSaving}
              disabled={isSaving}
              leftIcon={<Save className="h-4 w-4" />}
            >
              Save Store Information
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};