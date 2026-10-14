import React, { useEffect, useState } from "react";
import type { LocalStore } from "../offline/types";

interface StoreBuilderProps {
  onSave: (store: LocalStore, publish: boolean) => void | Promise<void>;
  initialStore?: LocalStore;
}

const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

export const StoreBuilder: React.FC<StoreBuilderProps> = ({
  onSave,
  initialStore,
}) => {
  const [storeName, setStoreName] = useState(initialStore?.name ?? "");

  const [description, setDescription] = useState(
    initialStore?.description ?? "",
  );

  const [hostStudentId, setHostStudentId] = useState(
    initialStore?.hostStudentId ?? "",
  );

  const [vendorOrigin, setVendorOrigin] = useState(
    initialStore?.vendorOrigin ?? "Commercial Center",
  );

  const [logoUrl, setLogoUrl] = useState(initialStore?.logoUrl ?? "");

  const [brandColor, setBrandColor] = useState(
    initialStore?.brandColor ?? "#2563eb",
  );

  const [openingTime, setOpeningTime] = useState(
    initialStore?.openingTime ?? "08:00",
  );

  const [closingTime, setClosingTime] = useState(
    initialStore?.closingTime ?? "17:00",
  );

  const [convenienceFee, setConvenienceFee] = useState(
    String(initialStore?.defaultConvenienceFee ?? 35),
  );

  const [markupPercentage, setMarkupPercentage] = useState(
    String(initialStore?.markupPercentage ?? 10),
  );

  const [isOpen, setIsOpen] = useState(initialStore?.isOpen ?? true);

  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  useEffect(() => {
    if (!initialStore) return;

    setStoreName(initialStore.name ?? "");
    setDescription(initialStore.description ?? "");
    setHostStudentId(initialStore.hostStudentId ?? "");
    setVendorOrigin(initialStore.vendorOrigin ?? "Commercial Center");
    setLogoUrl(initialStore.logoUrl ?? "");
    setBrandColor(initialStore.brandColor ?? "#2563eb");
    setOpeningTime(initialStore.openingTime ?? "08:00");
    setClosingTime(initialStore.closingTime ?? "17:00");
    setConvenienceFee(String(initialStore.defaultConvenienceFee ?? 35));
    setMarkupPercentage(String(initialStore.markupPercentage ?? 10));
    setIsOpen(initialStore.isOpen ?? true);
  }, [initialStore]);

  const storefrontSlug = createSlug(storeName);

  const handleSave = async (publish: boolean) => {
    setErrorMessage("");
    setSuccessMessage("");

    if (!storeName.trim() || !hostStudentId.trim() || !vendorOrigin.trim()) {
      setErrorMessage(
        "Please complete the store name, student ID, and store location.",
      );
      return;
    }

    if (
      !Number.isFinite(Number(convenienceFee)) ||
      Number(convenienceFee) < 0
    ) {
      setErrorMessage(
        "The convenience fee must be a valid non-negative number.",
      );
      return;
    }

    if (
      !Number.isFinite(Number(markupPercentage)) ||
      Number(markupPercentage) < 0 ||
      Number(markupPercentage) > 100
    ) {
      setErrorMessage("The markup percentage must be between 0 and 100.");
      return;
    }

    if (openingTime >= closingTime) {
      setErrorMessage("The closing time must be later than the opening time.");
      return;
    }

    const store: LocalStore = {
      id: initialStore?.id ?? crypto.randomUUID(),
      hostStudentId: hostStudentId.trim(),
      name: storeName.trim(),
      description: description.trim(),
      vendorOrigin: vendorOrigin.trim(),
      defaultConvenienceFee: Number(convenienceFee),
      markupPercentage: Number(markupPercentage),
      logoUrl: logoUrl.trim() || undefined,
      brandColor,
      openingTime,
      closingTime,
      storefrontSlug,
      isOpen,
      isPublished: publish,
      isActive: initialStore?.isActive ?? true,
      isSynced: false,
      updatedAt: Date.now(),
    };

    try {
      setIsSaving(true);
      await onSave(store, publish);

      setSuccessMessage(
        publish
          ? "Your storefront has been submitted for publishing."
          : "Your store settings have been saved.",
      );
    } catch {
      setErrorMessage("Unable to save your store. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 " +
    "text-sm outline-none transition focus:border-blue-500 " +
    "focus:ring-2 focus:ring-blue-100";

  const labelClass = "block text-sm font-medium text-gray-700";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          Store Management
        </p>

        <h1 className="mt-1 text-3xl font-bold text-gray-900">
          Create Your Virtual Store
        </h1>

        <p className="mt-2 text-gray-600">
          Set up your store for MSU students. Configure your details, branding,
          operating hours, and storefront preview.
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <form
          className="space-y-6 lg:col-span-2"
          onSubmit={(event) => event.preventDefault()}
        >
          {/* Store information */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              1. Store Information
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Tell customers who you are and what your store offers.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className={labelClass} htmlFor="storeName">
                  Store Name *
                </label>

                <input
                  id="storeName"
                  className={inputClass}
                  value={storeName}
                  onChange={(event) => setStoreName(event.target.value)}
                  placeholder="e.g. Campus Essentials"
                  maxLength={80}
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="hostStudentId">
                  Owner's Student ID *
                </label>

                <input
                  id="hostStudentId"
                  className={inputClass}
                  value={hostStudentId}
                  onChange={(event) => setHostStudentId(event.target.value)}
                  placeholder="Enter your MSU student ID"
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="description">
                  Store Description
                </label>

                <textarea
                  id="description"
                  className={inputClass}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe your products and services..."
                  rows={4}
                  maxLength={500}
                />

                <p className="mt-1 text-right text-xs text-gray-400">
                  {description.length}/500 characters
                </p>
              </div>

              <div>
                <label className={labelClass} htmlFor="vendorOrigin">
                  Store Location *
                </label>

                <select
                  id="vendorOrigin"
                  className={inputClass}
                  value={vendorOrigin}
                  onChange={(event) => setVendorOrigin(event.target.value)}
                >
                  <option value="Commercial Center">Commercial Center</option>
                  <option value="MSU Main Gate">MSU Main Gate</option>
                  <option value="Cafeteria">Cafeteria</option>
                  <option value="Campus Dormitory">Campus Dormitory</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </section>

          {/* Branding */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              2. Store Branding
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Customize the appearance of your storefront.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className={labelClass} htmlFor="logoUrl">
                  Logo Image URL
                </label>

                <input
                  id="logoUrl"
                  type="url"
                  className={inputClass}
                  value={logoUrl}
                  onChange={(event) => setLogoUrl(event.target.value)}
                  placeholder="https://example.com/logo.png"
                />

                <p className="mt-1 text-xs text-gray-500">
                  Enter a publicly accessible image URL.
                </p>
              </div>

              <div>
                <label className={labelClass} htmlFor="brandColor">
                  Brand Color
                </label>

                <div className="mt-1 flex items-center gap-3">
                  <input
                    id="brandColor"
                    type="color"
                    value={brandColor}
                    onChange={(event) => setBrandColor(event.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border border-gray-300 p-1"
                  />

                  <span className="text-sm text-gray-600">
                    {brandColor.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Operating hours */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              3. Operating Hours & Availability
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Let students know when your store is available.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="openingTime">
                  Opening Time
                </label>

                <input
                  id="openingTime"
                  type="time"
                  className={inputClass}
                  value={openingTime}
                  onChange={(event) => setOpeningTime(event.target.value)}
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="closingTime">
                  Closing Time
                </label>

                <input
                  id="closingTime"
                  type="time"
                  className={inputClass}
                  value={closingTime}
                  onChange={(event) => setClosingTime(event.target.value)}
                  required
                />
              </div>
            </div>

            <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-lg bg-gray-50 p-3">
              <input
                type="checkbox"
                checked={isOpen}
                onChange={(event) => setIsOpen(event.target.checked)}
                className="h-4 w-4 accent-blue-600"
              />

              <span>
                <span className="block text-sm font-medium text-gray-800">
                  Store is currently open
                </span>

                <span className="block text-xs text-gray-500">
                  Turn this off when you are temporarily unavailable.
                </span>
              </span>
            </label>
          </section>

          {/* Pricing */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              4. Store Pricing
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Configure the default fees used by your store.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="convenienceFee">
                  Convenience Fee (PHP)
                </label>

                <input
                  id="convenienceFee"
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={convenienceFee}
                  onChange={(event) => setConvenienceFee(event.target.value)}
                  required
                />
              </div>

              <div>
                <label className={labelClass} htmlFor="markupPercentage">
                  Markup Percentage (%)
                </label>

                <input
                  id="markupPercentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  className={inputClass}
                  value={markupPercentage}
                  onChange={(event) => setMarkupPercentage(event.target.value)}
                  required
                />
              </div>
            </div>
          </section>

          {/* Storefront URL */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              5. Storefront URL
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Your store URL is generated automatically from its name.
            </p>

            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <p className="break-all text-sm font-medium text-blue-700">
                {storefrontSlug
                  ? `/store/${storefrontSlug}`
                  : "Enter a store name to generate your URL."}
              </p>
            </div>
          </section>

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => void handleSave(false)}
              disabled={isSaving}
              className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save as Draft"}
            </button>

            <button
              type="button"
              onClick={() => void handleSave(true)}
              disabled={isSaving}
              className="rounded-lg px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ backgroundColor: brandColor }}
            >
              {isSaving ? "Saving..." : "Save & Publish"}
            </button>
          </div>
        </form>

        {/* Live storefront preview */}
        <aside className="lg:col-span-1">
          <div className="sticky top-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Live Preview
              </p>

              <h2 className="mt-1 text-lg font-bold text-gray-900">
                Your Storefront
              </h2>
            </div>

            <div
              className="p-5"
              style={{ borderTop: `5px solid ${brandColor}` }}
            >
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Store logo preview"
                    className="h-16 w-16 rounded-xl border border-gray-200 object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-xl text-2xl font-bold text-white"
                    style={{ backgroundColor: brandColor }}
                  >
                    {storeName.trim().charAt(0).toUpperCase() || "S"}
                  </div>
                )}

                <div className="min-w-0">
                  <h3 className="break-words text-lg font-bold text-gray-900">
                    {storeName || "Your Store Name"}
                  </h3>

                  <p className="text-xs text-gray-500">{vendorOrigin}</p>
                </div>
              </div>

              <p className="mt-4 whitespace-pre-wrap break-words text-sm text-gray-600">
                {description || "Your store description will appear here."}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span
                  className={
                    isOpen
                      ? "rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700"
                      : "rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
                  }
                >
                  {isOpen ? "Currently Open" : "Currently Closed"}
                </span>

                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  {openingTime} – {closingTime}
                </span>
              </div>

              <div className="mt-5 rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Storefront URL</p>

                <p className="mt-1 break-all text-sm font-medium text-blue-700">
                  {storefrontSlug
                    ? `/store/${storefrontSlug}`
                    : "Your URL will appear here"}
                </p>
              </div>

              <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Convenience Fee</span>

                  <span className="font-medium text-gray-800">
                    ₱{Number(convenienceFee || 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Markup</span>

                  <span className="font-medium text-gray-800">
                    {Number(markupPercentage || 0)}%
                  </span>
                </div>
              </div>

              <div
                className="mt-5 rounded-lg p-3 text-center text-sm font-semibold text-white"
                style={{ backgroundColor: brandColor }}
              >
                Store Preview
              </div>

              <p className="mt-3 text-center text-xs text-gray-400">
                Preview only. Saving or publishing requires a connected save
                handler.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default StoreBuilder;
