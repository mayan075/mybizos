"use client";

import { useState } from "react";
import { Save, User, Mail, Phone, MapPin, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  commPreference: "sms" | "email" | "both";
}

const initialProfile: ProfileData = {
  firstName: "Sarah",
  lastName: "Mitchell",
  email: "sarah.mitchell@email.com",
  phone: "(555) 867-5309",
  addressLine1: "456 Oak Avenue",
  addressLine2: "",
  city: "Anytown",
  state: "TX",
  zip: "75001",
  commPreference: "both",
};

function FormField({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: typeof User;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
        {Icon && <Icon className="h-3.5 w-3.5 text-gray-400" />}
        {label}
      </label>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [saved, setSaved] = useState(false);

  function updateField(field: keyof ProfileData, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Update your personal information and preferences
        </p>
      </div>

      {/* Profile card */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        {/* Avatar */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
            SM
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">
              {profile.firstName} {profile.lastName}
            </p>
            <p className="text-sm text-gray-500">Customer since January 2025</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Personal info */}
          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Personal Information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="First Name" icon={User}>
                <input
                  type="text"
                  value={profile.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Last Name">
                <input
                  type="text"
                  value={profile.lastName}
                  onChange={(e) => updateField("lastName", e.target.value)}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Email" icon={Mail}>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Phone" icon={Phone}>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className={inputClass}
                />
              </FormField>
            </div>
          </div>

          {/* Address */}
          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Address
            </h2>
            <div className="grid gap-4">
              <FormField label="Street Address" icon={MapPin}>
                <input
                  type="text"
                  value={profile.addressLine1}
                  onChange={(e) => updateField("addressLine1", e.target.value)}
                  className={inputClass}
                />
              </FormField>
              <FormField label="Apt / Suite / Unit">
                <input
                  type="text"
                  value={profile.addressLine2}
                  onChange={(e) => updateField("addressLine2", e.target.value)}
                  className={inputClass}
                  placeholder="Optional"
                />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField label="City">
                  <input
                    type="text"
                    value={profile.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    className={inputClass}
                  />
                </FormField>
                <FormField label="State">
                  <input
                    type="text"
                    value={profile.state}
                    onChange={(e) => updateField("state", e.target.value)}
                    className={inputClass}
                  />
                </FormField>
                <FormField label="ZIP Code">
                  <input
                    type="text"
                    value={profile.zip}
                    onChange={(e) => updateField("zip", e.target.value)}
                    className={inputClass}
                  />
                </FormField>
              </div>
            </div>
          </div>

          {/* Communication preferences */}
          <div>
            <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-gray-400">
              <Bell className="h-3.5 w-3.5" />
              Communication Preferences
            </h2>
            <p className="mb-3 text-sm text-gray-500">
              How would you like to receive appointment reminders and updates?
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
              {(
                [
                  { value: "sms", label: "SMS Only" },
                  { value: "email", label: "Email Only" },
                  { value: "both", label: "Both SMS & Email" },
                ] as const
              ).map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                    profile.commPreference === option.value
                      ? "border-blue-300 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <input
                    type="radio"
                    name="commPreference"
                    value={option.value}
                    checked={profile.commPreference === option.value}
                    onChange={() =>
                      setProfile((prev) => ({
                        ...prev,
                        commPreference: option.value,
                      }))
                    }
                    className="sr-only"
                  />
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full border-2",
                      profile.commPreference === option.value
                        ? "border-blue-600"
                        : "border-gray-300"
                    )}
                  >
                    {profile.commPreference === option.value && (
                      <div className="h-2 w-2 rounded-full bg-blue-600" />
                    )}
                  </div>
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Save className="h-4 w-4" />
            Save Changes
          </button>
          {saved && (
            <span className="text-sm font-medium text-green-600">
              Changes saved successfully!
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
