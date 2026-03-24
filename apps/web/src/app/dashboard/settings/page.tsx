"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  Globe,
  Clock,
  Phone,
  Mail,
  MapPin,
  Bot,
  CreditCard,
  Save,
  Plug,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  PhoneCall,
  Hash,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { getInitials } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BusinessHoursEntry {
  open: boolean;
  start: string;
  end: string;
}

type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

type BusinessHours = Record<DayOfWeek, BusinessHoursEntry>;

interface ProfileSettings {
  fullName: string;
  email: string;
  role: string;
}

interface GeneralSettings {
  businessName: string;
  phone: string;
  email: string;
  address: string;
  serviceArea: string;
  timezone: string;
  businessHours: BusinessHours;
}

interface AiAgentSettings {
  agentName: string;
  voice: string;
  greeting: string;
  answerCalls: boolean;
  autoRespondSms: boolean;
  leadScoring: boolean;
  autoBook: boolean;
  emergencyEscalation: boolean;
  priceQuoting: boolean;
  transferEmergency: boolean;
  transferHuman: boolean;
  transferHighValue: boolean;
  personalPhone: string;
  personalityNotes: string;
}

interface EmailSettings {
  businessEmail: string;
  emailSignature: string;
  sendConfirmations: boolean;
  sendReminders: boolean;
  sendReviewRequests: boolean;
}

interface IntegrationStatus {
  twilio: boolean;
  vapi: boolean;
  stripe: boolean;
  googleCalendar: boolean;
  resend: boolean;
  quickbooks: boolean;
}

interface AllSettings {
  profile: ProfileSettings;
  general: GeneralSettings;
  aiAgent: AiAgentSettings;
  email: EmailSettings;
  integrations: IntegrationStatus;
}

interface ValidationErrors {
  [key: string]: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = "mybizos_settings";

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
];

const VOICES = [
  "Professional (Clear, Neutral)",
  "Friendly (Warm, Welcoming)",
  "Energetic (Upbeat, Enthusiastic)",
];

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "general", label: "General", icon: Building2 },
  { id: "phone", label: "Phone System", icon: PhoneCall },
  { id: "ai-agent", label: "AI Receptionist", icon: Bot },
  { id: "email", label: "Email", icon: Mail },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "billing", label: "Billing", icon: CreditCard },
] as const;

type TabId = (typeof tabs)[number]["id"];

function isValidTab(value: string): value is TabId {
  return tabs.some((t) => t.id === value);
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const defaultBusinessHours: BusinessHours = {
  monday: { open: true, start: "08:00", end: "17:00" },
  tuesday: { open: true, start: "08:00", end: "17:00" },
  wednesday: { open: true, start: "08:00", end: "17:00" },
  thursday: { open: true, start: "08:00", end: "17:00" },
  friday: { open: true, start: "08:00", end: "17:00" },
  saturday: { open: true, start: "09:00", end: "13:00" },
  sunday: { open: false, start: "09:00", end: "13:00" },
};

const defaultSettings: AllSettings = {
  profile: {
    fullName: "Jim Henderson",
    email: "jim@acmehvac.com",
    role: "Owner",
  },
  general: {
    businessName: "Acme HVAC & Plumbing",
    phone: "(555) 123-4567",
    email: "info@acmehvac.com",
    address: "100 Main Street, Springfield, IL 62701",
    serviceArea: "Springfield, IL and surrounding 30 miles",
    timezone: "America/Chicago",
    businessHours: defaultBusinessHours,
  },
  aiAgent: {
    agentName: "Acme HVAC Assistant",
    voice: "Professional (Clear, Neutral)",
    greeting:
      "Hi, this is Acme HVAC's AI assistant. This call may be recorded. How can I help you today?",
    answerCalls: true,
    autoRespondSms: true,
    leadScoring: true,
    autoBook: true,
    emergencyEscalation: true,
    priceQuoting: true,
    transferEmergency: true,
    transferHuman: true,
    transferHighValue: false,
    personalPhone: "",
    personalityNotes: "",
  },
  email: {
    businessEmail: "info@acmehvac.com",
    emailSignature: "Best regards,\nAcme HVAC & Plumbing\n(555) 123-4567",
    sendConfirmations: true,
    sendReminders: true,
    sendReviewRequests: false,
  },
  integrations: {
    twilio: false,
    vapi: false,
    stripe: false,
    googleCalendar: false,
    resend: false,
    quickbooks: false,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadSettings(): AllSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw) as Partial<AllSettings>;
    // Merge with defaults to ensure all keys exist
    return {
      profile: { ...defaultSettings.profile, ...parsed.profile },
      general: {
        ...defaultSettings.general,
        ...parsed.general,
        businessHours: {
          ...defaultSettings.general.businessHours,
          ...parsed.general?.businessHours,
        },
      },
      aiAgent: { ...defaultSettings.aiAgent, ...parsed.aiAgent },
      email: { ...defaultSettings.email, ...parsed.email },
      integrations: { ...defaultSettings.integrations, ...parsed.integrations },
    };
  } catch {
    return defaultSettings;
  }
}

function saveSettings(settings: AllSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone: string): boolean {
  const digitsOnly = phone.replace(/\D/g, "");
  return digitsOnly.length >= 10;
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function ToggleSwitch({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors cursor-pointer shrink-0",
        enabled ? "bg-primary" : "bg-muted"
      )}
    >
      <div
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          enabled ? "right-0.5" : "left-0.5"
        )}
      />
    </button>
  );
}

function FieldError({ message }: { message: string | undefined }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-destructive mt-1">
      <AlertCircle className="h-3 w-3" />
      {message}
    </p>
  );
}

function InputField({
  icon: Icon,
  label,
  value,
  onChange,
  error,
  type = "text",
  disabled = false,
  placeholder,
}: {
  icon?: typeof Building2;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className={cn(
          "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 transition-colors",
          error
            ? "border-destructive focus:ring-destructive/30"
            : "border-input focus:ring-ring",
          disabled && "opacity-60 cursor-not-allowed"
        )}
      />
      <FieldError message={error} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner content that uses useSearchParams (must be in Suspense)
// ---------------------------------------------------------------------------

function SettingsContent() {
  usePageTitle("Settings");
  const router = useRouter();
  const searchParams = useSearchParams();

  // --- Tab from URL ---
  const tabParam = searchParams.get("tab") ?? "profile";
  const activeTab: TabId = isValidTab(tabParam) ? tabParam : "profile";

  function setActiveTab(tab: TabId) {
    router.push(`/dashboard/settings?tab=${tab}`, { scroll: false });
  }

  // --- State ---
  const [settings, setSettings] = useState<AllSettings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Password fields (not persisted)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setSettings(loadSettings());
    setHydrated(true);
  }, []);

  // --- Updaters ---
  const updateProfile = useCallback(
    (patch: Partial<ProfileSettings>) =>
      setSettings((s) => ({ ...s, profile: { ...s.profile, ...patch } })),
    []
  );

  const updateGeneral = useCallback(
    (patch: Partial<GeneralSettings>) =>
      setSettings((s) => ({ ...s, general: { ...s.general, ...patch } })),
    []
  );

  const updateBusinessHours = useCallback(
    (day: DayOfWeek, patch: Partial<BusinessHoursEntry>) =>
      setSettings((s) => ({
        ...s,
        general: {
          ...s.general,
          businessHours: {
            ...s.general.businessHours,
            [day]: { ...s.general.businessHours[day], ...patch },
          },
        },
      })),
    []
  );

  const updateAiAgent = useCallback(
    (patch: Partial<AiAgentSettings>) =>
      setSettings((s) => ({ ...s, aiAgent: { ...s.aiAgent, ...patch } })),
    []
  );

  const updateEmail = useCallback(
    (patch: Partial<EmailSettings>) =>
      setSettings((s) => ({ ...s, email: { ...s.email, ...patch } })),
    []
  );

  const updateIntegration = useCallback(
    (key: keyof IntegrationStatus, value: boolean) =>
      setSettings((s) => ({
        ...s,
        integrations: { ...s.integrations, [key]: value },
      })),
    []
  );

  // --- Toast ---
  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  // --- Validation ---
  function validateGeneral(): boolean {
    const errs: ValidationErrors = {};
    if (!validateEmail(settings.general.email)) {
      errs["general.email"] = "Please enter a valid email address";
    }
    if (!validatePhone(settings.general.phone)) {
      errs["general.phone"] = "Phone number must be at least 10 digits";
    }
    if (!settings.general.businessName.trim()) {
      errs["general.businessName"] = "Business name is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateProfileForm(): boolean {
    const errs: ValidationErrors = {};
    if (!settings.profile.fullName.trim()) {
      errs["profile.fullName"] = "Full name is required";
    }
    if (!validateEmail(settings.profile.email)) {
      errs["profile.email"] = "Please enter a valid email address";
    }
    // Only validate passwords if any field is filled
    if (currentPassword || newPassword || confirmPassword) {
      if (!currentPassword) {
        errs["profile.currentPassword"] = "Current password is required";
      }
      if (newPassword.length < 8) {
        errs["profile.newPassword"] =
          "New password must be at least 8 characters";
      }
      if (newPassword !== confirmPassword) {
        errs["profile.confirmPassword"] = "Passwords do not match";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // --- Save Handlers ---
  function handleSaveGeneral() {
    if (!validateGeneral()) {
      showToast("Please fix the errors below", "error");
      return;
    }
    saveSettings(settings);
    showToast("Settings saved!");
  }

  function handleSaveProfile() {
    if (!validateProfileForm()) {
      showToast("Please fix the errors below", "error");
      return;
    }
    saveSettings(settings);
    if (currentPassword && newPassword) {
      // In a real app this would call an API
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    showToast("Profile saved!");
  }

  function handleSaveAiAgent() {
    saveSettings(settings);
    showToast("AI agent configuration saved!");
  }

  function handleSaveEmail() {
    saveSettings(settings);
    showToast("Email settings saved!");
  }

  function handleSaveIntegrations() {
    saveSettings(settings);
    showToast("Integration settings saved!");
  }

  // Don't render form until hydrated (avoids hydration mismatch)
  if (!hydrated) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Loading settings...
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-top-2",
            toast.type === "success" ? "bg-emerald-600" : "bg-destructive"
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your organization settings and preferences
        </p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        {/* Sidebar tabs */}
        <nav className="flex gap-1 overflow-x-auto pb-2 md:w-56 md:shrink-0 md:flex-col md:space-y-1 md:overflow-x-visible md:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors md:w-full md:gap-3",
                activeTab === tab.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content area */}
        <div className="min-w-0 flex-1 max-w-2xl">
          {/* ============================================================= */}
          {/* PROFILE TAB                                                    */}
          {/* ============================================================= */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              {/* Avatar + Name */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-5">
                <h2 className="text-base font-semibold text-foreground">
                  Your Profile
                </h2>

                <div className="flex items-center gap-5">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground shrink-0">
                    {getInitials(settings.profile.fullName || "U")}
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-foreground">
                      {settings.profile.fullName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {settings.profile.email}
                    </p>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {settings.profile.role}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4">
                  <InputField
                    icon={User}
                    label="Full Name"
                    value={settings.profile.fullName}
                    onChange={(v) => {
                      updateProfile({ fullName: v });
                      setErrors((e) => {
                        const copy = { ...e };
                        delete copy["profile.fullName"];
                        return copy;
                      });
                    }}
                    error={errors["profile.fullName"]}
                  />

                  <InputField
                    icon={Mail}
                    label="Email Address"
                    value={settings.profile.email}
                    onChange={(v) => {
                      updateProfile({ email: v });
                      setErrors((e) => {
                        const copy = { ...e };
                        delete copy["profile.email"];
                        return copy;
                      });
                    }}
                    error={errors["profile.email"]}
                    type="email"
                  />

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      Role
                    </label>
                    <input
                      type="text"
                      value={settings.profile.role}
                      disabled
                      className="h-10 w-full rounded-lg border border-input bg-muted/50 px-3 text-sm text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Change Password */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-5">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Change Password
                </h2>
                <p className="text-sm text-muted-foreground">
                  Leave blank if you don&apos;t want to change your password.
                </p>

                <div className="grid gap-4">
                  {/* Current password */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPw ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value);
                          setErrors((prev) => {
                            const copy = { ...prev };
                            delete copy["profile.currentPassword"];
                            return copy;
                          });
                        }}
                        placeholder="Enter current password"
                        className={cn(
                          "h-10 w-full rounded-lg border bg-background px-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 transition-colors",
                          errors["profile.currentPassword"]
                            ? "border-destructive focus:ring-destructive/30"
                            : "border-input focus:ring-ring"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPw(!showCurrentPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showCurrentPw ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <FieldError message={errors["profile.currentPassword"]} />
                  </div>

                  {/* New password */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPw ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setErrors((prev) => {
                            const copy = { ...prev };
                            delete copy["profile.newPassword"];
                            return copy;
                          });
                        }}
                        placeholder="At least 8 characters"
                        className={cn(
                          "h-10 w-full rounded-lg border bg-background px-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 transition-colors",
                          errors["profile.newPassword"]
                            ? "border-destructive focus:ring-destructive/30"
                            : "border-input focus:ring-ring"
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPw(!showNewPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPw ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <FieldError message={errors["profile.newPassword"]} />
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setErrors((prev) => {
                          const copy = { ...prev };
                          delete copy["profile.confirmPassword"];
                          return copy;
                        });
                      }}
                      placeholder="Re-enter new password"
                      className={cn(
                        "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 transition-colors",
                        errors["profile.confirmPassword"]
                          ? "border-destructive focus:ring-destructive/30"
                          : "border-input focus:ring-ring"
                      )}
                    />
                    <FieldError message={errors["profile.confirmPassword"]} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-lg px-4",
                    "bg-primary text-primary-foreground text-sm font-medium",
                    "hover:bg-primary/90 transition-colors"
                  )}
                >
                  <Save className="h-4 w-4" />
                  Save Profile
                </button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* GENERAL TAB                                                    */}
          {/* ============================================================= */}
          {activeTab === "general" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 space-y-5">
                <h2 className="text-base font-semibold text-foreground">
                  Business Information
                </h2>

                <div className="grid gap-4">
                  <InputField
                    icon={Building2}
                    label="Business Name"
                    value={settings.general.businessName}
                    onChange={(v) => {
                      updateGeneral({ businessName: v });
                      setErrors((e) => {
                        const copy = { ...e };
                        delete copy["general.businessName"];
                        return copy;
                      });
                    }}
                    error={errors["general.businessName"]}
                  />

                  <div className="grid gap-4 sm:grid-cols-2">
                    <InputField
                      icon={Phone}
                      label="Phone"
                      value={settings.general.phone}
                      onChange={(v) => {
                        updateGeneral({ phone: v });
                        setErrors((e) => {
                          const copy = { ...e };
                          delete copy["general.phone"];
                          return copy;
                        });
                      }}
                      error={errors["general.phone"]}
                    />
                    <InputField
                      icon={Mail}
                      label="Email"
                      value={settings.general.email}
                      onChange={(v) => {
                        updateGeneral({ email: v });
                        setErrors((e) => {
                          const copy = { ...e };
                          delete copy["general.email"];
                          return copy;
                        });
                      }}
                      error={errors["general.email"]}
                      type="email"
                    />
                  </div>

                  <InputField
                    icon={MapPin}
                    label="Address"
                    value={settings.general.address}
                    onChange={(v) => updateGeneral({ address: v })}
                  />

                  <InputField
                    icon={MapPin}
                    label="Service Area"
                    value={settings.general.serviceArea}
                    onChange={(v) => updateGeneral({ serviceArea: v })}
                  />

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Timezone
                    </label>
                    <select
                      value={settings.general.timezone}
                      onChange={(e) =>
                        updateGeneral({ timezone: e.target.value })
                      }
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Business Hours */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-5">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Business Hours
                </h2>

                <div className="space-y-3">
                  {DAYS.map(({ key, label }) => {
                    const day = settings.general.businessHours[key];
                    return (
                      <div
                        key={key}
                        className={cn(
                          "flex items-center gap-3 rounded-lg border border-border p-3 transition-colors",
                          !day.open && "bg-muted/30"
                        )}
                      >
                        <div className="w-24 shrink-0">
                          <span
                            className={cn(
                              "text-sm font-medium",
                              day.open
                                ? "text-foreground"
                                : "text-muted-foreground"
                            )}
                          >
                            {label}
                          </span>
                        </div>

                        <ToggleSwitch
                          enabled={day.open}
                          onToggle={() =>
                            updateBusinessHours(key, { open: !day.open })
                          }
                        />

                        {day.open ? (
                          <div className="flex items-center gap-2 ml-2">
                            <input
                              type="time"
                              value={day.start}
                              onChange={(e) =>
                                updateBusinessHours(key, {
                                  start: e.target.value,
                                })
                              }
                              className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                            />
                            <span className="text-sm text-muted-foreground">
                              to
                            </span>
                            <input
                              type="time"
                              value={day.end}
                              onChange={(e) =>
                                updateBusinessHours(key, {
                                  end: e.target.value,
                                })
                              }
                              className="h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground ml-2">
                            Closed
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveGeneral}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-lg px-4",
                    "bg-primary text-primary-foreground text-sm font-medium",
                    "hover:bg-primary/90 transition-colors"
                  )}
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* PHONE SYSTEM TAB                                               */}
          {/* ============================================================= */}
          {activeTab === "phone" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                      <PhoneCall className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-foreground">
                        Phone System
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        2 numbers active, AI answering
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Connected
                  </span>
                </div>

                <div className="grid gap-4 grid-cols-3">
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Numbers</p>
                    <p className="text-lg font-semibold text-foreground">2</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">Calls Today</p>
                    <p className="text-lg font-semibold text-foreground">7</p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">AI Handled</p>
                    <p className="text-lg font-semibold text-foreground">5</p>
                  </div>
                </div>

                <Link
                  href="/dashboard/settings/phone"
                  className={cn(
                    "flex h-10 w-full items-center justify-center gap-2 rounded-lg",
                    "bg-primary text-primary-foreground text-sm font-medium",
                    "hover:bg-primary/90 transition-colors"
                  )}
                >
                  <Hash className="h-4 w-4" />
                  Manage Phone Numbers & Routing
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Your Numbers
                </h3>
                {[
                  {
                    num: "+1 (704) 555-0001",
                    name: "Main Business Line",
                    routing: "AI answers, forwards to Jim",
                  },
                  {
                    num: "+1 (704) 555-0002",
                    name: "Marketing / Google Ads",
                    routing: "AI answers, books appointments",
                  },
                ].map((n) => (
                  <div
                    key={n.num}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {n.num}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {n.name} &middot; {n.routing}
                      </p>
                    </div>
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* AI RECEPTIONIST TAB                                              */}
          {/* ============================================================= */}
          {activeTab === "ai-agent" && (
            <div className="space-y-6">
              {/* Greeting & Voice */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-5">
                <h2 className="text-base font-semibold text-foreground">
                  AI Receptionist
                </h2>
                <p className="text-sm text-muted-foreground">
                  Configure how your AI receptionist handles calls, books appointments, and qualifies leads.
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Greeting Message
                    </label>
                    <textarea
                      rows={3}
                      value={settings.aiAgent.greeting}
                      onChange={(e) =>
                        updateAiAgent({ greeting: e.target.value })
                      }
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      What your AI says when it answers the phone. Includes AI disclosure per compliance rules.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Voice Style
                    </label>
                    <select
                      value={settings.aiAgent.voice}
                      onChange={(e) =>
                        updateAiAgent({ voice: e.target.value })
                      }
                      className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    >
                      {VOICES.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* When to transfer */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h2 className="text-base font-semibold text-foreground">
                  When to Transfer to You
                </h2>
                <p className="text-sm text-muted-foreground">
                  Choose when the AI should transfer the call to your personal phone.
                </p>

                {([
                  {
                    key: "transferEmergency" as const,
                    title: "Emergency situations",
                    desc: "Flooding, gas leaks, fire, or other urgent situations",
                  },
                  {
                    key: "transferHuman" as const,
                    title: "Customer requests a human",
                    desc: "When the caller specifically asks to speak to a person",
                  },
                  {
                    key: "transferHighValue" as const,
                    title: "High-value quote requests",
                    desc: "Large jobs that need a personal touch",
                  },
                ] as const).map((item) => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between rounded-lg border border-border p-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                    <ToggleSwitch
                      enabled={settings.aiAgent[item.key]}
                      onToggle={() =>
                        updateAiAgent({ [item.key]: !settings.aiAgent[item.key] })
                      }
                    />
                  </div>
                ))}

                <InputField
                  icon={Phone}
                  label="Your Personal Number (for transfers)"
                  value={settings.aiAgent.personalPhone}
                  onChange={(v) => updateAiAgent({ personalPhone: v })}
                  placeholder="+1 555 123 4567"
                />
              </div>

              {/* AI Capabilities */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h2 className="text-base font-semibold text-foreground">
                  AI Capabilities
                </h2>

                {([
                  {
                    key: "answerCalls" as const,
                    title: "Answer calls",
                    desc: "AI receptionist answers inbound phone calls automatically",
                  },
                  {
                    key: "autoRespondSms" as const,
                    title: "Auto-respond SMS",
                    desc: "AI responds to incoming text messages automatically",
                  },
                  {
                    key: "autoBook" as const,
                    title: "Auto-book appointments",
                    desc: "Allow AI to book appointments without human approval",
                  },
                  {
                    key: "leadScoring" as const,
                    title: "Lead scoring",
                    desc: "AI automatically scores leads based on conversation",
                  },
                  {
                    key: "emergencyEscalation" as const,
                    title: "Emergency escalation",
                    desc: "Instantly alert you for emergency keywords (flooding, gas leak, fire)",
                  },
                  {
                    key: "priceQuoting" as const,
                    title: "Price quoting",
                    desc: "AI provides price ranges (never exact pricing)",
                  },
                ] as const).map((toggle) => (
                  <div
                    key={toggle.key}
                    className="flex items-center justify-between rounded-lg border border-border p-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{toggle.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{toggle.desc}</p>
                    </div>
                    <ToggleSwitch
                      enabled={settings.aiAgent[toggle.key]}
                      onToggle={() =>
                        updateAiAgent({ [toggle.key]: !settings.aiAgent[toggle.key] })
                      }
                    />
                  </div>
                ))}
              </div>

              {/* AI Personality Notes */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h2 className="text-base font-semibold text-foreground">
                  AI Personality Notes
                </h2>
                <p className="text-sm text-muted-foreground">
                  Special instructions for how your AI should behave. These are applied to every call.
                </p>
                <textarea
                  rows={4}
                  value={settings.aiAgent.personalityNotes}
                  onChange={(e) => updateAiAgent({ personalityNotes: e.target.value })}
                  placeholder="e.g. Be extra friendly, always mention our 5-year warranty, ask about their timeline..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveAiAgent}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-lg px-4",
                    "bg-primary text-primary-foreground text-sm font-medium",
                    "hover:bg-primary/90 transition-colors"
                  )}
                >
                  <Save className="h-4 w-4" />
                  Save AI Configuration
                </button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* EMAIL TAB                                                       */}
          {/* ============================================================= */}
          {activeTab === "email" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-border bg-card p-6 space-y-5">
                <h2 className="text-base font-semibold text-foreground">
                  Email Settings
                </h2>
                <p className="text-sm text-muted-foreground">
                  Configure how MyBizOS sends emails on your behalf.
                </p>

                <div className="space-y-4">
                  <InputField
                    icon={Mail}
                    label="Business Email Address"
                    value={settings.email.businessEmail}
                    onChange={(v) => updateEmail({ businessEmail: v })}
                    placeholder="info@yourbusiness.com"
                    type="email"
                  />

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Email Signature
                    </label>
                    <textarea
                      rows={4}
                      value={settings.email.emailSignature}
                      onChange={(e) => updateEmail({ emailSignature: e.target.value })}
                      placeholder="Best regards,&#10;Your Business Name&#10;(555) 123-4567"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Automated emails */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h2 className="text-base font-semibold text-foreground">
                  Automated Emails
                </h2>
                <p className="text-sm text-muted-foreground">
                  Toggle which automated emails your customers receive.
                </p>

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Appointment confirmations
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Send a confirmation email when an appointment is booked
                    </p>
                  </div>
                  <ToggleSwitch
                    enabled={settings.email.sendConfirmations}
                    onToggle={() =>
                      updateEmail({ sendConfirmations: !settings.email.sendConfirmations })
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Appointment reminders
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Send reminders 24 hours and 1 hour before the appointment
                    </p>
                  </div>
                  <ToggleSwitch
                    enabled={settings.email.sendReminders}
                    onToggle={() =>
                      updateEmail({ sendReminders: !settings.email.sendReminders })
                    }
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Review requests
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ask customers for a review after their service is complete
                    </p>
                  </div>
                  <ToggleSwitch
                    enabled={settings.email.sendReviewRequests}
                    onToggle={() =>
                      updateEmail({ sendReviewRequests: !settings.email.sendReviewRequests })
                    }
                  />
                </div>
              </div>

              {/* Email preview */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h2 className="text-base font-semibold text-foreground">
                  Email Preview
                </h2>
                <p className="text-sm text-muted-foreground">
                  Here is what your appointment confirmation email looks like.
                </p>
                <div className="rounded-lg border border-border bg-muted/30 p-5 space-y-3">
                  <div className="text-xs text-muted-foreground">
                    From: {settings.email.businessEmail || "info@yourbusiness.com"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Subject: Your appointment is confirmed
                  </div>
                  <div className="border-t border-border pt-3 space-y-2">
                    <p className="text-sm text-foreground">
                      Hi [Customer Name],
                    </p>
                    <p className="text-sm text-foreground">
                      Your appointment has been confirmed for [Date] at [Time].
                    </p>
                    <p className="text-sm text-foreground">
                      Service: [Service Name]
                    </p>
                    <p className="text-sm text-foreground">
                      If you need to reschedule, please call us or reply to this email.
                    </p>
                    <div className="pt-2 text-sm text-muted-foreground whitespace-pre-line">
                      {settings.email.emailSignature || "Best regards,\nYour Business"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveEmail}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-lg px-4",
                    "bg-primary text-primary-foreground text-sm font-medium",
                    "hover:bg-primary/90 transition-colors"
                  )}
                >
                  <Save className="h-4 w-4" />
                  Save Email Settings
                </button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* INTEGRATIONS TAB                                               */}
          {/* ============================================================= */}
          {activeTab === "integrations" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-6 space-y-2">
                <h2 className="text-base font-semibold text-foreground">
                  Integrations
                </h2>
                <p className="text-sm text-muted-foreground">
                  Connect your tools and services to MyBizOS.
                </p>
              </div>

              {(
                [
                  {
                    key: "twilio" as const,
                    name: "Twilio",
                    desc: "SMS and voice calls",
                    icon: Phone,
                    configUrl: "/dashboard/settings/phone",
                  },
                  {
                    key: "vapi" as const,
                    name: "Vapi.ai",
                    desc: "AI voice agent platform",
                    icon: Bot,
                    configUrl: "",
                  },
                  {
                    key: "stripe" as const,
                    name: "Stripe",
                    desc: "Payment processing",
                    icon: CreditCard,
                    configUrl: "",
                  },
                  {
                    key: "googleCalendar" as const,
                    name: "Google Calendar",
                    desc: "Calendar sync",
                    icon: Clock,
                    configUrl: "",
                  },
                  {
                    key: "resend" as const,
                    name: "Resend",
                    desc: "Transactional email",
                    icon: Mail,
                    configUrl: "",
                  },
                  {
                    key: "quickbooks" as const,
                    name: "QuickBooks",
                    desc: "Accounting & invoicing",
                    icon: Globe,
                    configUrl: "",
                  },
                ] as const
              ).map((integration) => {
                const connected = settings.integrations[integration.key];
                return (
                  <div
                    key={integration.key}
                    className="flex items-center justify-between rounded-xl border border-border bg-card p-5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <integration.icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {integration.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {integration.desc}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <ToggleSwitch
                        enabled={connected}
                        onToggle={() => {
                          updateIntegration(integration.key, !connected);
                          // Auto-save integrations on toggle
                          const next = {
                            ...settings,
                            integrations: {
                              ...settings.integrations,
                              [integration.key]: !connected,
                            },
                          };
                          saveSettings(next);
                          showToast(
                            `${integration.name} ${!connected ? "connected" : "disconnected"}`
                          );
                        }}
                      />
                      {connected && (
                        <button
                          onClick={() =>
                            integration.configUrl
                              ? router.push(integration.configUrl)
                              : showToast(
                                  `${integration.name} settings — coming soon`
                                )
                          }
                          className="flex h-8 items-center gap-1.5 rounded-lg border border-input px-3 text-xs text-muted-foreground hover:bg-muted transition-colors"
                        >
                          Configure
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ============================================================= */}
          {/* BILLING TAB                                                    */}
          {/* ============================================================= */}
          {activeTab === "billing" && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-5">
              <h2 className="text-base font-semibold text-foreground">
                Billing & Subscription
              </h2>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Pro Plan
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      $199/month per location
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    Active
                  </span>
                </div>
                <div className="grid gap-4 grid-cols-3 mt-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      AI Minutes Used
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      847 / 2,000
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">SMS Sent</p>
                    <p className="text-sm font-semibold text-foreground">
                      1,234 / 5,000
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Next Billing
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      Apr 1, 2026
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">
                  Payment Method
                </h3>
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-foreground">
                        Visa ending in 4242
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expires 12/2027
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      showToast(
                        "Payment method update — redirecting to Stripe portal"
                      )
                    }
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Update
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">
                  Recent Invoices
                </h3>
                <div className="divide-y divide-border rounded-lg border border-border">
                  {[
                    { date: "Mar 1, 2026", amount: "$199.00", status: "Paid" },
                    { date: "Feb 1, 2026", amount: "$199.00", status: "Paid" },
                    { date: "Jan 1, 2026", amount: "$199.00", status: "Paid" },
                  ].map((inv) => (
                    <div
                      key={inv.date}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex items-center gap-4">
                        <p className="text-sm text-foreground">{inv.date}</p>
                        <p className="text-sm font-medium text-foreground">
                          {inv.amount}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-emerald-600">
                          {inv.status}
                        </span>
                        <button
                          onClick={() => showToast("Invoice download started")}
                          className="text-xs text-primary hover:underline"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page export — wraps SettingsContent in Suspense (required by useSearchParams)
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Loading settings...
            </p>
          </div>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
