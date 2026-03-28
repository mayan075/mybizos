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
      <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground/80">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />}
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
    "w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-ring/20";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your personal information and preferences
        </p>
      </div>

      {/* Profile card */}
      <div className="rounded-xl border border-border bg-card p-6">
        {/* Avatar */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
            SM
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">
              {profile.firstName} {profile.lastName}
            </p>
            <p className="text-sm text-muted-foreground">Customer since January 2025</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Personal info */}
          <div>
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">
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
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">
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
            <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-muted-foreground/70">
              <Bell className="h-3.5 w-3.5" />
              Communication Preferences
            </h2>
            <p className="mb-3 text-sm text-muted-foreground">
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
                      ? "border-primary/30 bg-primary/5 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted/50"
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
                        ? "border-primary"
                        : "border-border"
                    )}
                  >
                    {profile.commPreference === option.value && (
                      <div className="h-2 w-2 rounded-full bg-primary" />
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
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
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
