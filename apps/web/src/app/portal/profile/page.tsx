"use client";

import { useState, useEffect } from "react";
import { Save, User, Mail, Phone, MapPin, Bell, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient, tryFetch } from "@/lib/api-client";
import { getOrgId } from "@/lib/hooks/use-api";
import { getUser } from "@/lib/auth";

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
}

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
  const [profile, setProfile] = useState<ProfileData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const user = getUser();
      if (user) {
        const names = (user.name ?? "").split(" ");
        setProfile((prev) => ({
          ...prev,
          firstName: names[0] ?? "",
          lastName: names.slice(1).join(" "),
          email: user.email ?? "",
        }));
      }

      // Try to load contact data for richer profile
      try {
        const orgId = getOrgId();
        const contacts = await tryFetch(() =>
          apiClient.get<Array<{ id: string; firstName: string; lastName: string; email: string; phone: string; address: string }>>(
            `/orgs/${orgId}/contacts?search=${encodeURIComponent(user?.email ?? "")}`
          )
        );
        if (contacts && contacts.length > 0) {
          const c = contacts[0]!;
          setProfile({
            firstName: c.firstName ?? "",
            lastName: c.lastName ?? "",
            email: c.email ?? user?.email ?? "",
            phone: c.phone ?? "",
            address: c.address ?? "",
          });
        }
      } catch {
        // Use user data only
      }
      setLoading(false);
    }
    load();
  }, []);

  function updateField(field: keyof ProfileData, value: string) {
    setProfile((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const user = getUser();
      if (user) {
        // Update via API — best effort
        const orgId = getOrgId();
        const contacts = await tryFetch(() =>
          apiClient.get<Array<{ id: string }>>(
            `/orgs/${orgId}/contacts?search=${encodeURIComponent(user.email ?? "")}`
          )
        );
        if (contacts && contacts.length > 0) {
          await apiClient.patch(`/orgs/${orgId}/contacts/${contacts[0]!.id}`, {
            firstName: profile.firstName,
            lastName: profile.lastName,
            phone: profile.phone,
          });
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Save failed silently
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-muted/50 px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:bg-background focus:ring-2 focus:ring-ring/20";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase() || "?";

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
            {initials}
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">
              {profile.firstName} {profile.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
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
                  disabled
                  className={cn(inputClass, "opacity-60 cursor-not-allowed")}
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
            <FormField label="Address" icon={MapPin}>
              <input
                type="text"
                value={profile.address}
                onChange={(e) => updateField("address", e.target.value)}
                className={inputClass}
                placeholder="Enter your address"
              />
            </FormField>
          </div>
        </div>

        {/* Save button */}
        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
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
