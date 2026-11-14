import React, { ChangeEvent, FormEvent, useState } from 'react';
import {
  Check,
  CreditCard,
  ImagePlus,
  MapPin,
  RotateCcw,
  Save,
  ShieldCheck,
  Star,
  Store,
  Upload,
  UserRound,
} from 'lucide-react';
import { Button } from '../shared/Button';
import { Card } from '../shared/Card';

const STORAGE_KEY = 'msu_pakawit_merchant_profile';
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_CATEGORIES = 5;

const MARKETPLACE_CATEGORIES = [
  'Textbooks & Notes',
  'Dorm Essentials',
  'Snacks & Delicacies',
  'Electronics & Gadgets',
  'Apparel & Hijabs',
  'Printing Services',
  'School Supplies',
  'Second-hand Items',
];

const COLLEGES = [
  'College of Information Technology',
  'College of Engineering',
  'College of Business Administration & Accountancy',
  'College of Education',
  'College of Health Sciences',
  'College of Social Sciences & Humanities',
  'College of Agriculture',
  'College of Science & Mathematics',
];

interface MerchantProfile {
  fullName: string;
  studentId: string;
  college: string;
  campusAddress: string;
  gcashNumber: string;
  gcashName: string;
  shopName: string;
  tagline: string;
  bio: string;
  avatarUrl: string;
  isVerified: boolean;
  rating: number;
  totalSales: number;
  categories: string[];
}

type RequiredField =
  | 'fullName'
  | 'studentId'
  | 'campusAddress'
  | 'gcashNumber'
  | 'gcashName'
  | 'shopName'
  | 'bio';

type EditableField = Exclude<
  keyof MerchantProfile,
  'isVerified' | 'rating' | 'totalSales' | 'categories'
>;

type ProfileErrors = Partial<Record<RequiredField, string>>;

const DEFAULT_PROFILE: MerchantProfile = {
  fullName: 'Amerah Macarambon',
  studentId: '202409922',
  college: 'College of Information Technology',
  campusAddress: 'Dormitory 4, MSU Main Campus, Marawi City',
  gcashNumber: '09171234567',
  gcashName: 'AMERAH M.',
  shopName: "Amerah's Campus Finds",
  tagline: 'Affordable review books, dorm essentials, & homemade halal snacks for MSUans!',
  bio: '4th year BSIT student. Selling second-hand textbooks, printing services, and fresh Maranao pastries available for meetup at Commercial Center or Dorms!',
  avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
  isVerified: true,
  rating: 4.9,
  totalSales: 84,
  categories: ['Textbooks & Notes', 'Dorm Essentials', 'Snacks & Delicacies', 'Printing Services'],
};

const isMerchantProfile = (value: unknown): value is MerchantProfile => {
  if (!value || typeof value !== 'object') return false;
  const profile = value as Partial<MerchantProfile>;
  return (
    typeof profile.fullName === 'string' &&
    typeof profile.studentId === 'string' &&
    typeof profile.college === 'string' &&
    typeof profile.campusAddress === 'string' &&
    typeof profile.gcashNumber === 'string' &&
    typeof profile.gcashName === 'string' &&
    typeof profile.shopName === 'string' &&
    typeof profile.tagline === 'string' &&
    typeof profile.bio === 'string' &&
    typeof profile.avatarUrl === 'string' &&
    typeof profile.isVerified === 'boolean' &&
    typeof profile.rating === 'number' &&
    typeof profile.totalSales === 'number' &&
    Array.isArray(profile.categories) &&
    profile.categories.every((category) => typeof category === 'string')
  );
};

const readStoredProfile = (): { profile: MerchantProfile; error: string | null } => {
  try {
    const savedProfile = window.localStorage.getItem(STORAGE_KEY);
    if (!savedProfile) return { profile: DEFAULT_PROFILE, error: null };

    const parsedProfile: unknown = JSON.parse(savedProfile);
    if (!isMerchantProfile(parsedProfile)) {
      throw new Error('Stored merchant profile has an unexpected format.');
    }

    return { profile: parsedProfile, error: null };
  } catch (error) {
    console.error('Failed to load the saved merchant profile', error);
    return {
      profile: DEFAULT_PROFILE,
      error: 'The saved profile could not be loaded. Review the details and save to replace it.',
    };
  }
};

const validateField = (field: RequiredField, value: string): string => {
  if (field === 'fullName') {
    if (!value.trim()) return 'Student full name is required.';
    if (value.trim().length < 3) return 'Name must be at least 3 characters.';
  }

  if (field === 'studentId') {
    if (!value.trim()) return 'MSU Student ID is required.';
    if (!/^\d{9}$/.test(value)) return 'Student ID must be 9 digits.';
  }

  if (field === 'campusAddress' && !value.trim()) {
    return 'Campus meetup location or dormitory is required.';
  }

  if (field === 'gcashNumber') {
    if (!value.trim()) return 'GCash mobile number is required.';
    if (!/^(09|\+639)\d{9}$/.test(value.replace(/\s+/g, ''))) {
      return 'Enter a valid Philippine mobile number (09XXXXXXXXX).';
    }
  }

  if (field === 'gcashName' && !value.trim()) {
    return 'GCash registered account name is required.';
  }

  if (field === 'shopName' && !value.trim()) {
    return 'Merchant shop name is required.';
  }

  if (field === 'bio' && value.length > 200) {
    return 'Description must be 200 characters or fewer.';
  }

  return '';
};

const REQUIRED_FIELDS: RequiredField[] = [
  'fullName',
  'studentId',
  'campusAddress',
  'gcashNumber',
  'gcashName',
  'shopName',
  'bio',
];

const isRequiredField = (field: EditableField): field is RequiredField =>
  REQUIRED_FIELDS.some((requiredField) => requiredField === field);

const ProfileAvatar: React.FC<{ src: string; alt: string; className: string }> = ({
  src,
  alt,
  className,
}) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <div className={`${className} flex items-center justify-center bg-slate-100 text-slate-400`}>
        <UserRound className="h-1/2 w-1/2" aria-label={alt} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailedSrc(src)}
    />
  );
};

export const MerchantProfileSettings: React.FC = () => {
  const [initialState] = useState(readStoredProfile);
  const [formData, setFormData] = useState<MerchantProfile>(initialState.profile);
  const [savedProfile, setSavedProfile] = useState<MerchantProfile>(initialState.profile);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [touched, setTouched] = useState<Partial<Record<RequiredField, boolean>>>({});
  const [storageError, setStorageError] = useState(initialState.error);
  const [notice, setNotice] = useState('');
  const [noticeIsError, setNoticeIsError] = useState(false);

  const updateNotice = (message: string, isError = false) => {
    setNotice(message);
    setNoticeIsError(isError);
  };

  const handleTextChange =
    (field: EditableField) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { value } = event.currentTarget;
      setFormData((current) => ({ ...current, [field]: value }));
      updateNotice('');

      if (isRequiredField(field) && touched[field]) {
        setErrors((current) => ({
          ...current,
          [field]: validateField(field, value),
        }));
      }
    };

  const handleBlur = (field: RequiredField) => () => {
    setTouched((current) => ({ ...current, [field]: true }));
    setErrors((current) => ({
      ...current,
      [field]: validateField(field, formData[field]),
    }));
  };

  const handleCategoryToggle = (category: string) => {
    const isSelected = formData.categories.includes(category);
    if (!isSelected && formData.categories.length >= MAX_CATEGORIES) {
      updateNotice(`You can select up to ${MAX_CATEGORIES} categories.`, true);
      return;
    }

    updateNotice('');
    setFormData((current) => ({
      ...current,
      categories: isSelected
        ? current.categories.filter((item) => item !== category)
        : [...current.categories, category],
    }));
  };

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    updateNotice('');

    if (!file) return;
    if (!file.type.startsWith('image/')) {
      updateNotice('Choose an image file to update the shop avatar.', true);
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      updateNotice('Choose an image smaller than 2 MB.', true);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageData = reader.result;
      if (typeof imageData !== 'string') {
        updateNotice('This image could not be previewed. Choose another file.', true);
        return;
      }
      setFormData((current) => ({ ...current, avatarUrl: imageData }));
      updateNotice('Image preview updated. Save the profile to keep this change.');
    };
    reader.onerror = () => {
      console.error('Failed to read the selected merchant avatar', reader.error);
      updateNotice('This image could not be read. Choose another file.', true);
    };
    reader.readAsDataURL(file);
  };

  const handleReset = () => {
    setFormData(savedProfile);
    setErrors({});
    setTouched({});
    updateNotice('Unsaved changes were discarded.');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateNotice('');

    const nextErrors: ProfileErrors = {};
    for (const field of REQUIRED_FIELDS) {
      const error = validateField(field, formData[field]);
      if (error) nextErrors[field] = error;
    }
    setTouched({
      fullName: true,
      studentId: true,
      campusAddress: true,
      gcashNumber: true,
      gcashName: true,
      shopName: true,
      bio: true,
    });
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      updateNotice('Review the highlighted fields before saving.', true);
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      setSavedProfile(formData);
      setStorageError(null);
      updateNotice('Merchant profile saved on this device.');
    } catch (error) {
      console.error('Failed to save the merchant profile', error);
      updateNotice('The profile could not be saved in this browser. Check available storage and try again.', true);
    }
  };

  const inputClassName = (field: RequiredField) =>
    `mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 ${
      errors[field]
        ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100'
        : 'border-slate-300 focus:border-msu-maroon focus:ring-msu-maroon/10'
    }`;

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6" aria-labelledby="merchant-settings-title">
      <header>
        <h1 id="merchant-settings-title" className="text-2xl font-bold text-slate-900">
          Merchant Profile Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Manage your student seller details and public Pakawit shop profile.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Profile changes are stored in this browser for the local demo.
        </p>
      </header>

      {storageError && (
        <p role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {storageError}
        </p>
      )}
      {notice && (
        <p
          role={noticeIsError ? 'alert' : 'status'}
          className={`rounded-lg px-4 py-3 text-sm ${
            noticeIsError
              ? 'bg-rose-50 text-rose-700'
              : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {notice}
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Student and shop details</h2>
              <p className="mt-1 text-sm text-slate-600">
                Fields marked with <span className="text-rose-600">*</span> are required.
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Reset
            </Button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold text-slate-800">Shop avatar</legend>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <ProfileAvatar
                  src={formData.avatarUrl}
                  alt="Merchant avatar preview"
                  className="h-20 w-20 shrink-0 rounded-2xl border border-slate-200 object-cover"
                />
                <div className="min-w-0 flex-1 space-y-3">
                  <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <Upload className="mr-2 h-4 w-4" aria-hidden="true" />
                    Upload image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="sr-only"
                      aria-label="Upload shop avatar"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Or paste an image URL
                    <input
                      type="url"
                      value={formData.avatarUrl}
                      onChange={handleTextChange('avatarUrl')}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="https://example.com/image.jpg"
                    />
                  </label>
                  <p className="text-xs text-slate-500">Image uploads must be smaller than 2 MB.</p>
                </div>
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Full name <span className="text-rose-600">*</span>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={handleTextChange('fullName')}
                  onBlur={handleBlur('fullName')}
                  autoComplete="name"
                  className={inputClassName('fullName')}
                  aria-invalid={Boolean(errors.fullName)}
                  aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                />
                {errors.fullName && <span id="fullName-error" className="mt-1 block text-xs text-rose-700">{errors.fullName}</span>}
              </label>

              <label className="block text-sm font-medium text-slate-700">
                MSU student ID <span className="text-rose-600">*</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.studentId}
                  onChange={handleTextChange('studentId')}
                  onBlur={handleBlur('studentId')}
                  placeholder="9 digits"
                  className={`${inputClassName('studentId')} font-mono`}
                  aria-invalid={Boolean(errors.studentId)}
                  aria-describedby={errors.studentId ? 'studentId-error' : undefined}
                />
                {errors.studentId && <span id="studentId-error" className="mt-1 block text-xs text-rose-700">{errors.studentId}</span>}
              </label>

              <label className="block text-sm font-medium text-slate-700">
                College / department
                <select
                  value={formData.college}
                  onChange={handleTextChange('college')}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                >
                  {COLLEGES.map((college) => <option key={college} value={college}>{college}</option>)}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Meetup location / dorm address <span className="text-rose-600">*</span>
                <input
                  type="text"
                  value={formData.campusAddress}
                  onChange={handleTextChange('campusAddress')}
                  onBlur={handleBlur('campusAddress')}
                  className={inputClassName('campusAddress')}
                  aria-invalid={Boolean(errors.campusAddress)}
                  aria-describedby={errors.campusAddress ? 'campusAddress-error' : undefined}
                />
                {errors.campusAddress && <span id="campusAddress-error" className="mt-1 block text-xs text-rose-700">{errors.campusAddress}</span>}
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Shop / brand name <span className="text-rose-600">*</span>
                <input
                  type="text"
                  value={formData.shopName}
                  onChange={handleTextChange('shopName')}
                  onBlur={handleBlur('shopName')}
                  className={inputClassName('shopName')}
                  aria-invalid={Boolean(errors.shopName)}
                  aria-describedby={errors.shopName ? 'shopName-error' : undefined}
                />
                {errors.shopName && <span id="shopName-error" className="mt-1 block text-xs text-rose-700">{errors.shopName}</span>}
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Shop tagline
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={handleTextChange('tagline')}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="A short introduction to your shop"
                />
              </label>
            </div>

            <fieldset className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <legend className="px-1 text-sm font-semibold text-slate-800">
                <CreditCard className="mr-2 inline h-4 w-4" aria-hidden="true" />
                GCash payout details
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  GCash mobile number <span className="text-rose-600">*</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={formData.gcashNumber}
                    onChange={handleTextChange('gcashNumber')}
                    onBlur={handleBlur('gcashNumber')}
                    autoComplete="tel"
                    className={inputClassName('gcashNumber')}
                    aria-invalid={Boolean(errors.gcashNumber)}
                    aria-describedby={errors.gcashNumber ? 'gcashNumber-error' : undefined}
                  />
                  {errors.gcashNumber && <span id="gcashNumber-error" className="mt-1 block text-xs text-rose-700">{errors.gcashNumber}</span>}
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  GCash account name <span className="text-rose-600">*</span>
                  <input
                    type="text"
                    value={formData.gcashName}
                    onChange={handleTextChange('gcashName')}
                    onBlur={handleBlur('gcashName')}
                    className={inputClassName('gcashName')}
                    aria-invalid={Boolean(errors.gcashName)}
                    aria-describedby={errors.gcashName ? 'gcashName-error' : undefined}
                  />
                  {errors.gcashName && <span id="gcashName-error" className="mt-1 block text-xs text-rose-700">{errors.gcashName}</span>}
                </label>
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-slate-800">
                Selling categories <span className="font-normal text-slate-500">(up to {MAX_CATEGORIES})</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {MARKETPLACE_CATEGORIES.map((category) => {
                  const isSelected = formData.categories.includes(category);
                  return (
                    <button
                      type="button"
                      key={category}
                      onClick={() => handleCategoryToggle(category)}
                      aria-pressed={isSelected}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        isSelected
                          ? 'border-msu-maroon bg-msu-maroon text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}{category}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="block text-sm font-medium text-slate-700">
              Merchant description / meetup policies
              <textarea
                rows={4}
                value={formData.bio}
                onChange={handleTextChange('bio')}
                onBlur={handleBlur('bio')}
                className={inputClassName('bio')}
                aria-invalid={Boolean(errors.bio)}
                aria-describedby={errors.bio ? 'bio-error' : 'bio-count'}
              />
              <span id="bio-count" className="mt-1 block text-right text-xs text-slate-500">
                {formData.bio.length}/200
              </span>
              {errors.bio && <span id="bio-error" className="block text-xs text-rose-700">{errors.bio}</span>}
            </label>

            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={formData.isVerified}
                onChange={(event) => {
                  setFormData((current) => ({ ...current, isVerified: event.currentTarget.checked }));
                }}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-msu-maroon focus:ring-msu-maroon"
              />
              <span>Display the MSU verified student badge on my public shop card.</span>
            </label>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
              <Button type="button" variant="outline" onClick={handleReset}>
                Discard changes
              </Button>
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                Save merchant profile
              </Button>
            </div>
          </form>
        </Card>

        <aside className="space-y-4 lg:col-span-5" aria-label="Public shop preview">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Public shop preview</h2>
            <p className="mt-1 text-sm text-slate-600">Preview updates as you edit your details.</p>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="bg-gradient-to-r from-msu-maroon-dark via-msu-maroon to-msu-maroon-light p-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1 text-xs font-semibold">
                  <Store className="h-4 w-4" aria-hidden="true" />
                  MSU Pakawit Merchant
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-msu-gold-light">
                  <Star className="h-4 w-4 fill-current" aria-hidden="true" />
                  {formData.rating.toFixed(1)}
                  <span className="text-xs font-normal text-white/80">({formData.totalSales} sales)</span>
                </span>
              </div>
              <div className="mt-5 flex items-center gap-4">
                <ProfileAvatar
                  src={formData.avatarUrl}
                  alt="Public shop avatar"
                  className="h-20 w-20 rounded-2xl border-4 border-white object-cover shadow"
                />
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold">
                    {formData.shopName || 'Your shop name'}
                  </h3>
                  <p className="truncate text-sm text-white/85">
                    {formData.fullName || 'Your name'} · {formData.studentId || 'Student ID'}
                  </p>
                  {formData.isVerified && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      MSU verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <p className="text-sm font-medium text-msu-maroon">{formData.tagline || 'Shop tagline'}</p>
              <p className="flex items-start gap-2 text-sm text-slate-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-msu-maroon" aria-hidden="true" />
                <span>{formData.campusAddress || 'Meetup location not set'}</span>
              </p>
              <p className="whitespace-pre-wrap text-sm text-slate-600">
                {formData.bio || 'Add a description of your shop and meetup preferences.'}
              </p>

              <div className="flex flex-wrap gap-2">
                {formData.categories.map((category) => (
                  <span
                    key={category}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                  >
                    {category}
                  </span>
                ))}
                {formData.categories.length === 0 && (
                  <span className="text-xs text-slate-500">No categories selected.</span>
                )}
              </div>

              <div className="border-t border-slate-200 pt-4 text-xs text-slate-500">
                <Check className="mr-1 inline h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                {formData.college}
              </div>
            </div>
          </Card>

          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
            <ImagePlus className="mt-0.5 h-5 w-5 shrink-0 text-msu-maroon" aria-hidden="true" />
            <p>Your profile preview is private to this page until you save the changes.</p>
          </div>
        </aside>
      </div>
    </section>
  );
};
