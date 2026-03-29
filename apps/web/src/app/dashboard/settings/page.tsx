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
  Loader2,
  Check,
  Zap,
  Wallet,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { getUser } from "@/lib/auth";
import { getOnboardingData } from "@/lib/onboarding";
import { apiClient, tryFetch } from "@/lib/api-client";
import { getOrgId, useApiQuery, useApiMutation } from "@/lib/hooks/use-api";
import { useToast } from "@/components/ui/toast";

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

interface WalletBalance {
  amount: number;
  currency: string;
}

interface WalletTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  balanceAfter: number;
  type: 'credit' | 'debit';
}

interface AutoRechargeConfig {
  enabled: boolean;
  threshold: number;
  amount: number;
}

interface UsageRate {
  label: string;
  unit: string;
  rate: number;
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

const STORAGE_KEY = "hararai_settings";

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
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Perth",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Dublin",
  "Pacific/Auckland",
  "Pacific/Honolulu",
  "Africa/Johannesburg",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Dubai",
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

/**
 * Build default settings from onboarding data and authenticated user profile.
 * No more hardcoded business names or personal details (Fix #2 + #8).
 */
function buildDefaultSettings(): AllSettings {
  const user = typeof window !== "undefined" ? getUser() : null;
  const onboarding = typeof window !== "undefined" ? getOnboardingData() : null;

  const businessName = onboarding?.businessName ?? user?.orgName ?? "";
  const userEmail = user?.email ?? "";
  const userName = user?.name ?? "";
  const userRole = user?.role ?? "owner";
  const timezone = onboarding?.timezone ?? (typeof window !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "America/New_York");
  const serviceArea = onboarding?.serviceArea ?? "";
  const city = onboarding?.city ?? "";
  const personalPhone = onboarding?.aiReceptionist?.personalPhone ?? "";
  const aiGreeting = onboarding?.aiReceptionist?.greeting ?? (
    businessName
      ? `Hi, this is ${businessName}'s AI assistant. This call may be recorded. How can I help you today?`
      : ""
  );
  const transferEmergency = onboarding?.aiReceptionist?.transferWhen?.emergency ?? true;
  const transferHuman = onboarding?.aiReceptionist?.transferWhen?.customerRequestsHuman ?? true;
  const transferHighValue = onboarding?.aiReceptionist?.transferWhen?.highValueQuote ?? false;

  // Map onboarding hours to settings hours format if available
  const businessHours: BusinessHours = onboarding?.businessHours
    ? (Object.fromEntries(
        Object.entries(onboarding.businessHours).map(([day, h]) => [
          day,
          { open: (h as { open: boolean; start: string; end: string }).open, start: (h as { open: boolean; start: string; end: string }).start, end: (h as { open: boolean; start: string; end: string }).end },
        ]),
      ) as BusinessHours)
    : defaultBusinessHours;

  return {
    profile: {
      fullName: userName,
      email: userEmail,
      role: userRole.charAt(0).toUpperCase() + userRole.slice(1),
    },
    general: {
      businessName,
      phone: "",
      email: userEmail,
      address: city,
      serviceArea,
      timezone,
      businessHours,
    },
    aiAgent: {
      agentName: businessName ? `${businessName} Assistant` : "",
      voice: "Professional (Clear, Neutral)",
      greeting: aiGreeting,
      answerCalls: true,
      autoRespondSms: true,
      leadScoring: true,
      autoBook: true,
      emergencyEscalation: true,
      priceQuoting: true,
      transferEmergency,
      transferHuman,
      transferHighValue,
      personalPhone,
      personalityNotes: "",
    },
    email: {
      businessEmail: userEmail,
      emailSignature: businessName ? `Best regards,\n${businessName}` : "",
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
}

// Computed at module-load only on client; SSR uses empty defaults
const defaultSettings: AllSettings = typeof window !== "undefined" ? buildDefaultSettings() : {
  profile: { fullName: "", email: "", role: "Owner" },
  general: { businessName: "", phone: "", email: "", address: "", serviceArea: "", timezone: "America/New_York", businessHours: defaultBusinessHours },
  aiAgent: { agentName: "", voice: "Professional (Clear, Neutral)", greeting: "", answerCalls: true, autoRespondSms: true, leadScoring: true, autoBook: true, emergencyEscalation: true, priceQuoting: true, transferEmergency: true, transferHuman: true, transferHighValue: false, personalPhone: "", personalityNotes: "" },
  email: { businessEmail: "", emailSignature: "", sendConfirmations: true, sendReminders: true, sendReviewRequests: false },
  integrations: { twilio: false, vapi: false, stripe: false, googleCalendar: false, resend: false, quickbooks: false },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mergeSettings(defaults: AllSettings, partial: Partial<AllSettings>): AllSettings {
  return {
    profile: { ...defaults.profile, ...partial.profile },
    general: {
      ...defaults.general,
      ...partial.general,
      businessHours: {
        ...defaults.general.businessHours,
        ...partial.general?.businessHours,
      },
    },
    aiAgent: { ...defaults.aiAgent, ...partial.aiAgent },
    email: { ...defaults.email, ...partial.email },
    integrations: { ...defaults.integrations, ...partial.integrations },
  };
}

function loadSettingsFromLocalStorage(): AllSettings {
  if (typeof window === "undefined") return buildDefaultSettings();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildDefaultSettings();
    const parsed = JSON.parse(raw) as Partial<AllSettings>;
    return mergeSettings(buildDefaultSettings(), parsed);
  } catch {
    return buildDefaultSettings();
  }
}

/**
 * Load settings from API first, fall back to localStorage, then defaults.
 */
async function loadSettingsFromApi(): Promise<AllSettings> {
  const defaults = buildDefaultSettings();
  try {
    const orgId = getOrgId();
    const result = await tryFetch(() =>
      apiClient.get<{ data: Record<string, unknown> }>(`/orgs/${orgId}/settings`),
    );
    if (result && typeof result === "object" && "data" in result) {
      const apiSettings = (result as { data: Record<string, unknown> }).data as Partial<AllSettings>;
      if (apiSettings && Object.keys(apiSettings).length > 0) {
        // Also update localStorage for offline access
        const merged = mergeSettings(defaults, apiSettings);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch {
    // API unavailable, fall through to localStorage
  }
  return loadSettingsFromLocalStorage();
}

/**
 * Save settings to both localStorage and the API.
 */
async function saveSettingsToApi(settings: AllSettings): Promise<boolean> {
  // Always save to localStorage for immediate access
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  try {
    const orgId = getOrgId();
    await apiClient.post(`/orgs/${orgId}/settings`, settings);
    return true;
  } catch {
    // API save failed, but localStorage is updated
    return false;
  }
}

import { z } from "zod";

const generalSettingsSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().regex(/^\+?[\d\s()\-]{10,}$/, "Phone number must be at least 10 digits"),
});

const profileSettingsSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Please enter a valid email address"),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine(
  (data) => {
    if (data.currentPassword || data.newPassword || data.confirmPassword) {
      return !!data.currentPassword;
    }
    return true;
  },
  { message: "Current password is required", path: ["currentPassword"] },
).refine(
  (data) => {
    if (data.currentPassword || data.newPassword || data.confirmPassword) {
      return (data.newPassword ?? "").length >= 8;
    }
    return true;
  },
  { message: "New password must be at least 8 characters", path: ["newPassword"] },
).refine(
  (data) => {
    if (data.currentPassword || data.newPassword || data.confirmPassword) {
      return data.newPassword === data.confirmPassword;
    }
    return true;
  },
  { message: "Passwords do not match", path: ["confirmPassword"] },
);

function validateEmail(email: string): boolean {
  return z.string().email().safeParse(email).success;
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
  const toast = useToast();

  // --- Tab from URL ---
  const tabParam = searchParams.get("tab") ?? "profile";
  const activeTab: TabId = isValidTab(tabParam) ? tabParam : "profile";

  function setActiveTab(tab: TabId) {
    router.push(`/dashboard/settings?tab=${tab}`, { scroll: false });
  }

  // --- State ---
  const [settings, setSettings] = useState<AllSettings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // Password fields (not persisted)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // --- Billing state (fetched from API, not hardcoded) ---
  interface BillingData {
    plan: string;
    status: string;
    subscription: { id: string; currentPeriodEnd: number; cancelAtPeriodEnd: boolean } | null;
    usage: { aiMinutes: number; aiMinutesLimit: number; smsSent: number; smsLimit: number };
    invoices: { id: string; date: string; amount: string; status: string; hostedUrl: string | null; pdfUrl: string | null }[];
  }
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);

  // --- Wallet state ---
  const [topUpModalOpen, setTopUpModalOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<number | "">("");
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [autoRecharge, setAutoRecharge] = useState<AutoRechargeConfig>({
    enabled: false,
    threshold: 5,
    amount: 25,
  });
  const [autoRechargeSaving, setAutoRechargeSaving] = useState(false);

  // Load from API on mount, fall back to localStorage
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const loaded = await loadSettingsFromApi();
      if (!cancelled) {
        setSettings(loaded);
        setHydrated(true);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Fetch billing data when billing tab is active
  useEffect(() => {
    if (activeTab !== "billing") return;
    let cancelled = false;
    async function fetchBilling() {
      setBillingLoading(true);
      try {
        const orgId = getOrgId();
        const result = await tryFetch(() =>
          apiClient.get<{ data: BillingData }>(`/orgs/${orgId}/billing`),
        );
        if (!cancelled && result && typeof result === "object" && "data" in result) {
          setBillingData((result as { data: BillingData }).data);
        }
      } catch {
        // API unavailable
      }
      if (!cancelled) setBillingLoading(false);
    }
    fetchBilling();
    return () => { cancelled = true; };
  }, [activeTab]);

  // --- Wallet API hooks ---
  const walletEnabled = activeTab === "billing";

  const {
    data: walletBalance,
    isLoading: walletBalanceLoading,
    refetch: refetchBalance,
  } = useApiQuery<WalletBalance>(
    "/orgs/:orgId/wallet/balance",
    { amount: 0, currency: "AUD" },
    undefined,
    walletEnabled,
  );

  const {
    data: walletTransactions,
    isLoading: walletTransactionsLoading,
    refetch: refetchTransactions,
  } = useApiQuery<WalletTransaction[]>(
    "/orgs/:orgId/wallet/transactions",
    [],
    { limit: "5" },
    walletEnabled,
  );

  const {
    data: walletAutoRecharge,
    isLoading: walletAutoRechargeLoading,
  } = useApiQuery<AutoRechargeConfig>(
    "/orgs/:orgId/wallet/auto-recharge",
    { enabled: false, threshold: 5, amount: 25 },
    undefined,
    walletEnabled,
  );

  const {
    data: usageRates,
    isLoading: usageRatesLoading,
  } = useApiQuery<UsageRate[]>(
    "/orgs/:orgId/wallet/rates",
    [
      { label: "AI Call", unit: "minute", rate: 0.15 },
      { label: "SMS (AU)", unit: "message", rate: 0.05 },
      { label: "SMS (US)", unit: "message", rate: 0.01 },
      { label: "Phone Number", unit: "month", rate: 5.00 },
    ],
    undefined,
    walletEnabled,
  );

  // Sync auto-recharge from API when it loads
  useEffect(() => {
    if (walletAutoRecharge && !walletAutoRechargeLoading) {
      setAutoRecharge(walletAutoRecharge);
    }
  }, [walletAutoRecharge, walletAutoRechargeLoading]);

  const { mutate: topUpWallet } = useApiMutation<{ amount: number }, { url: string }>(
    "/orgs/:orgId/wallet/topup",
    "post",
  );

  const { mutate: saveAutoRecharge } = useApiMutation<AutoRechargeConfig, AutoRechargeConfig>(
    "/orgs/:orgId/wallet/auto-recharge",
    "post",
  );

  const handleTopUp = useCallback(async (amount: number) => {
    if (amount <= 0) return;
    setTopUpLoading(true);
    try {
      const result = await topUpWallet({ amount });
      if (result && "url" in result && result.url) {
        window.location.href = result.url;
        return;
      }
      showToast("Top-up initiated. Redirecting to payment...");
      setTopUpModalOpen(false);
    } catch {
      showToast("Failed to start top-up. Please try again.", "error");
    }
    setTopUpLoading(false);
  }, [topUpWallet]);

  const handleSaveAutoRecharge = useCallback(async () => {
    setAutoRechargeSaving(true);
    try {
      await saveAutoRecharge(autoRecharge);
      showToast("Auto-recharge settings saved.");
    } catch {
      showToast("Failed to save auto-recharge settings.", "error");
    }
    setAutoRechargeSaving(false);
  }, [autoRecharge, saveAutoRecharge]);

  const openBillingPortal = useCallback(async () => {
    setPortalLoading(true);
    try {
      const orgId = getOrgId();
      const result = await tryFetch(() =>
        apiClient.post<{ data: { url: string } }>(`/orgs/${orgId}/billing/portal`, {}),
      );
      if (result && typeof result === "object" && "data" in result) {
        const url = (result as { data: { url: string } }).data?.url;
        if (url) {
          window.location.href = url;
          return;
        }
      }
      showToast("Unable to open billing portal. Please try again.");
    } catch {
      showToast("Unable to open billing portal. Please try again.");
    }
    setPortalLoading(false);
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

  // --- Toast helper (delegates to shared toast system) ---
  function showToast(message: string, type: "success" | "error" = "success") {
    if (type === "error") {
      toast.error(message);
    } else {
      toast.success(message);
    }
  }

  // --- Validation (Zod-based) ---
  function validateGeneral(): boolean {
    const result = generalSettingsSchema.safeParse({
      businessName: settings.general.businessName.trim(),
      email: settings.general.email.trim(),
      phone: settings.general.phone.trim(),
    });
    if (result.success) {
      setErrors({});
      return true;
    }
    const errs: ValidationErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      const key = `general.${field}`;
      if (!errs[key]) errs[key] = issue.message;
    }
    setErrors(errs);
    return false;
  }

  function validateProfileForm(): boolean {
    const result = profileSettingsSchema.safeParse({
      fullName: settings.profile.fullName.trim(),
      email: settings.profile.email.trim(),
      currentPassword: currentPassword || undefined,
      newPassword: newPassword || undefined,
      confirmPassword: confirmPassword || undefined,
    });
    if (result.success) {
      setErrors({});
      return true;
    }
    const errs: ValidationErrors = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string;
      const key = `profile.${field}`;
      if (!errs[key]) errs[key] = issue.message;
    }
    setErrors(errs);
    return false;
  }

  // --- Save Handlers (with loading state) ---
  async function handleSaveGeneral() {
    if (!validateGeneral()) {
      showToast("Please fix the errors below", "error");
      return;
    }
    setSavingSection("general");
    try {
      const saved = await saveSettingsToApi(settings);
      showToast(saved ? "Settings saved!" : "Saved locally (API unavailable)");
    } catch {
      showToast("Failed to save settings", "error");
    } finally {
      setSavingSection(null);
    }
  }

  async function handleSaveProfile() {
    if (!validateProfileForm()) {
      showToast("Please fix the errors below", "error");
      return;
    }
    setSavingSection("profile");
    try {
      const saved = await saveSettingsToApi(settings);
      if (currentPassword && newPassword) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
      showToast(saved ? "Profile saved!" : "Saved locally (API unavailable)");
    } catch {
      showToast("Failed to save profile", "error");
    } finally {
      setSavingSection(null);
    }
  }

  async function handleSaveAiAgent() {
    setSavingSection("ai-agent");
    try {
      const saved = await saveSettingsToApi(settings);
      showToast(saved ? "AI agent configuration saved!" : "Saved locally (API unavailable)");
    } catch {
      showToast("Failed to save AI configuration", "error");
    } finally {
      setSavingSection(null);
    }
  }

  async function handleSaveEmail() {
    setSavingSection("email");
    try {
      const saved = await saveSettingsToApi(settings);
      showToast(saved ? "Email settings saved!" : "Saved locally (API unavailable)");
    } catch {
      showToast("Failed to save email settings", "error");
    } finally {
      setSavingSection(null);
    }
  }

  async function handleSaveIntegrations() {
    setSavingSection("integrations");
    try {
      const saved = await saveSettingsToApi(settings);
      showToast(saved ? "Integration settings saved!" : "Saved locally (API unavailable)");
    } catch {
      showToast("Failed to save integration settings", "error");
    } finally {
      setSavingSection(null);
    }
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
                  disabled={savingSection === "profile"}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-lg px-4",
                    "bg-primary text-primary-foreground text-sm font-medium",
                    "hover:bg-primary/90 transition-colors",
                    savingSection === "profile" && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {savingSection === "profile" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {savingSection === "profile" ? "Saving..." : "Save Profile"}
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
                  disabled={savingSection === "general"}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-lg px-4",
                    "bg-primary text-primary-foreground text-sm font-medium",
                    "hover:bg-primary/90 transition-colors",
                    savingSection === "general" && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {savingSection === "general" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {savingSection === "general" ? "Saving..." : "Save Changes"}
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
                <p className="text-xs text-muted-foreground mb-2">Your real numbers will appear here once connected via Phone System settings.</p>
                {([] as { num: string; name: string; routing: string }[]).map((n) => (
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
                  disabled={savingSection === "ai-agent"}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-lg px-4",
                    "bg-primary text-primary-foreground text-sm font-medium",
                    "hover:bg-primary/90 transition-colors",
                    savingSection === "ai-agent" && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {savingSection === "ai-agent" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {savingSection === "ai-agent" ? "Saving..." : "Save AI Configuration"}
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
                  Configure how HararAI sends emails on your behalf.
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
                  disabled={savingSection === "email"}
                  className={cn(
                    "flex h-9 items-center gap-2 rounded-lg px-4",
                    "bg-primary text-primary-foreground text-sm font-medium",
                    "hover:bg-primary/90 transition-colors",
                    savingSection === "email" && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {savingSection === "email" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {savingSection === "email" ? "Saving..." : "Save Email Settings"}
                </button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* INTEGRATIONS TAB                                               */}
          {/* ============================================================= */}
          {activeTab === "integrations" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Plug className="h-4 w-4" />
                  Integrations
                </h2>
                <p className="text-sm text-muted-foreground">
                  Connect third-party services to HararAI using OAuth. Manage all your
                  Facebook, Instagram, Google, QuickBooks, and Stripe connections from the
                  dedicated Integrations hub.
                </p>

                <Link
                  href="/dashboard/integrations"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Plug className="h-4 w-4" />
                  Open Integrations Hub
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {/* Quick Status — Internal services with toggles */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Internal Services
                </h3>
                <p className="text-xs text-muted-foreground mb-3">
                  These are managed by the platform admin and don&apos;t use OAuth.
                </p>

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
                      key: "resend" as const,
                      name: "Resend",
                      desc: "Transactional email",
                      icon: Mail,
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
                            const next = {
                              ...settings,
                              integrations: {
                                ...settings.integrations,
                                [integration.key]: !connected,
                              },
                            };
                            saveSettingsToApi(next);
                            showToast(
                              `${integration.name} ${!connected ? "connected" : "disconnected"}`
                            );
                          }}
                        />
                        {connected && integration.configUrl && (
                          <button
                            onClick={() => router.push(integration.configUrl)}
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

              {billingLoading && !billingData ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading billing info...</span>
                </div>
              ) : (
                <>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {billingData?.plan === "pro" ? "Pro Plan" : "Free Plan"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {billingData?.plan === "pro" ? "$199/month per location" : "Get started for free"}
                        </p>
                      </div>
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        billingData?.status === "active"
                          ? "bg-emerald-500/10 text-emerald-700"
                          : "bg-amber-500/10 text-amber-700"
                      )}>
                        {billingData?.status === "active" ? "Active" : billingData?.status === "trialing" ? "Trial" : "Inactive"}
                      </span>
                    </div>
                    <div className="grid gap-4 grid-cols-3 mt-4">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          AI Minutes Used
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          {billingData?.usage?.aiMinutes?.toLocaleString() ?? "0"} / {billingData?.usage?.aiMinutesLimit?.toLocaleString() ?? "100"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">SMS Sent</p>
                        <p className="text-sm font-semibold text-foreground">
                          {billingData?.usage?.smsSent?.toLocaleString() ?? "0"} / {billingData?.usage?.smsLimit?.toLocaleString() ?? "50"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Next Billing
                        </p>
                        <p className="text-sm font-semibold text-foreground">
                          {billingData?.subscription?.currentPeriodEnd
                            ? new Date(billingData.subscription.currentPeriodEnd * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                            : "N/A"}
                        </p>
                      </div>
                    </div>
                    {billingData?.subscription?.cancelAtPeriodEnd && (
                      <p className="text-xs text-amber-600 mt-2">
                        Your subscription will cancel at the end of the current period.
                      </p>
                    )}
                  </div>

                  {/* Upgrade cards — shown when on free plan */}
                  {(!billingData?.plan || billingData?.plan === "free") && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium text-foreground">
                        Upgrade Your Plan
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Unlock AI phone agents, more contacts, and advanced features. 14-day free trial included.
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Starter */}
                        <div className="rounded-xl border border-border p-5 space-y-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">Starter</p>
                            <p className="text-2xl font-bold text-foreground mt-1">$49<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                          </div>
                          <ul className="space-y-1.5 text-xs text-muted-foreground">
                            <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> 2,000 contacts</li>
                            <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Unified inbox</li>
                            <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Deal pipeline</li>
                            <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Online booking</li>
                            <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Email campaigns</li>
                          </ul>
                          <button
                            onClick={async () => {
                              setUpgradeLoading("starter");
                              try {
                                const orgId = getOrgId();
                                const result = await apiClient.post<{ data: { url: string } }>(`/orgs/${orgId}/billing/subscribe`, { priceId: "starter" });
                                if (result?.data?.url) {
                                  window.location.href = result.data.url;
                                }
                              } catch {
                                showToast("Failed to start checkout. Please try again.");
                              }
                              setUpgradeLoading(null);
                            }}
                            disabled={upgradeLoading !== null}
                            className="w-full rounded-lg border border-primary px-3 py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
                          >
                            {upgradeLoading === "starter" ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" />
                            ) : (
                              "Start Free Trial"
                            )}
                          </button>
                        </div>
                        {/* Pro — highlighted */}
                        <div className="rounded-xl border-2 border-primary bg-primary/5 p-5 space-y-3 relative">
                          <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                            Most Popular
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-foreground">Pro</p>
                            <p className="text-2xl font-bold text-foreground mt-1">$99<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                          </div>
                          <ul className="space-y-1.5 text-xs text-muted-foreground">
                            <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Everything in Starter</li>
                            <li className="flex items-center gap-1.5"><Zap className="h-3 w-3 text-primary shrink-0" /> AI Phone Agent (24/7)</li>
                            <li className="flex items-center gap-1.5"><Zap className="h-3 w-3 text-primary shrink-0" /> AI SMS follow-ups</li>
                            <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> 10,000 contacts, 5 users</li>
                            <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500 shrink-0" /> Advanced automations</li>
                          </ul>
                          <button
                            onClick={async () => {
                              setUpgradeLoading("pro");
                              try {
                                const orgId = getOrgId();
                                const result = await apiClient.post<{ data: { url: string } }>(`/orgs/${orgId}/billing/subscribe`, { priceId: "pro" });
                                if (result?.data?.url) {
                                  window.location.href = result.data.url;
                                }
                              } catch {
                                showToast("Failed to start checkout. Please try again.");
                              }
                              setUpgradeLoading(null);
                            }}
                            disabled={upgradeLoading !== null}
                            className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                          >
                            {upgradeLoading === "pro" ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" />
                            ) : (
                              "Start Free Trial"
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground">
                      Manage Subscription
                    </h3>
                    <div className="flex items-center justify-between rounded-lg border border-border p-4">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-foreground">
                            Update payment method, change plan, or view full billing history
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Opens Stripe Customer Portal
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={openBillingPortal}
                        disabled={portalLoading}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                      >
                        {portalLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ExternalLink className="h-3.5 w-3.5" />
                        )}
                        Manage Billing
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-foreground">
                      Recent Invoices
                    </h3>
                    <div className="divide-y divide-border rounded-lg border border-border">
                      {(billingData?.invoices ?? []).length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                          No invoices yet
                        </div>
                      ) : (
                        billingData?.invoices.map((inv) => (
                          <div
                            key={inv.id}
                            className="flex items-center justify-between px-4 py-3"
                          >
                            <div className="flex items-center gap-4">
                              <p className="text-sm text-foreground">{inv.date}</p>
                              <p className="text-sm font-medium text-foreground">
                                {inv.amount}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={cn(
                                "text-xs font-medium",
                                inv.status === "Paid" ? "text-emerald-600" : "text-amber-600"
                              )}>
                                {inv.status}
                              </span>
                              {inv.pdfUrl && (
                                <a
                                  href={inv.pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline"
                                >
                                  Download
                                </a>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ============================================================= */}
          {/* WALLET / CREDITS (within billing tab)                          */}
          {/* ============================================================= */}
          {activeTab === "billing" && (
            <div className="space-y-5">
              {/* ── Wallet Balance Card ──────────────────────────────────── */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Wallet className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-foreground">
                        Wallet Balance
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Pay-as-you-go credits for AI calls, SMS &amp; more
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { refetchBalance(); refetchTransactions(); }}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Refresh balance"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    {walletBalanceLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Loading...</span>
                      </div>
                    ) : (
                      <>
                        <p className="text-3xl font-bold text-foreground">
                          ${walletBalance.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {walletBalance.currency}
                        </p>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => setTopUpModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Add Credits
                  </button>
                </div>

                {/* Recent Transactions */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground">Recent Transactions</h3>
                    <Link
                      href="/dashboard/settings?tab=billing&view=transactions"
                      className="text-xs text-primary hover:text-primary/80 transition-colors"
                    >
                      View All
                    </Link>
                  </div>
                  <div className="divide-y divide-border rounded-lg border border-border">
                    {walletTransactionsLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-xs text-muted-foreground">Loading transactions...</span>
                      </div>
                    ) : walletTransactions.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                        No transactions yet
                      </div>
                    ) : (
                      walletTransactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-full",
                              tx.type === "credit"
                                ? "bg-emerald-500/10"
                                : "bg-red-500/10"
                            )}>
                              {tx.type === "credit" ? (
                                <ArrowDownRight className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <ArrowUpRight className="h-3.5 w-3.5 text-red-600" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm text-foreground">{tx.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(tx.date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={cn(
                              "text-sm font-medium",
                              tx.type === "credit" ? "text-emerald-600" : "text-red-600"
                            )}>
                              {tx.type === "credit" ? "+" : "-"}${Math.abs(tx.amount).toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Bal: ${tx.balanceAfter.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* ── Auto-Recharge Toggle ─────────────────────────────────── */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Auto-Recharge</h3>
                <p className="text-xs text-muted-foreground">
                  Automatically top up your wallet when the balance drops below a threshold.
                </p>

                <div className="flex items-center justify-between">
                  <label className="text-sm text-foreground" htmlFor="auto-recharge-toggle">
                    Enable auto-recharge
                  </label>
                  <button
                    id="auto-recharge-toggle"
                    role="switch"
                    aria-checked={autoRecharge.enabled}
                    onClick={() => setAutoRecharge((prev) => ({ ...prev, enabled: !prev.enabled }))}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out",
                      autoRecharge.enabled ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        autoRecharge.enabled ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                {autoRecharge.enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground" htmlFor="recharge-threshold">
                        When balance drops below
                      </label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        <input
                          id="recharge-threshold"
                          type="number"
                          min={1}
                          step={1}
                          value={autoRecharge.threshold}
                          onChange={(e) => setAutoRecharge((prev) => ({ ...prev, threshold: Number(e.target.value) }))}
                          className="w-full rounded-lg border border-border bg-background py-2 pl-7 pr-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground" htmlFor="recharge-amount">
                        Recharge amount
                      </label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        <input
                          id="recharge-amount"
                          type="number"
                          min={5}
                          step={5}
                          value={autoRecharge.amount}
                          onChange={(e) => setAutoRecharge((prev) => ({ ...prev, amount: Number(e.target.value) }))}
                          className="w-full rounded-lg border border-border bg-background py-2 pl-7 pr-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {autoRecharge.enabled && (
                  <p className="text-xs text-muted-foreground">
                    Recharge <span className="font-medium text-foreground">${autoRecharge.amount.toFixed(2)}</span> when balance drops below{" "}
                    <span className="font-medium text-foreground">${autoRecharge.threshold.toFixed(2)}</span>
                  </p>
                )}

                <button
                  onClick={handleSaveAutoRecharge}
                  disabled={autoRechargeSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-4 py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
                >
                  {autoRechargeSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save Auto-Recharge
                </button>
              </div>

              {/* ── Usage Rates Card ─────────────────────────────────────── */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Usage Rates</h3>
                <p className="text-xs text-muted-foreground">
                  Current per-unit pricing for your account.
                </p>

                {usageRatesLoading ? (
                  <div className="flex items-center gap-2 py-4">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Loading rates...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {usageRates.map((rate) => (
                      <div
                        key={rate.label}
                        className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
                      >
                        <p className="text-sm text-foreground">{rate.label}</p>
                        <p className="text-sm font-semibold text-foreground">
                          ${rate.rate.toFixed(2)}<span className="text-xs font-normal text-muted-foreground">/{rate.unit}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Top-Up Modal ─────────────────────────────────────────── */}
              {topUpModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                  <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-foreground">Add Credits</h3>
                      <button
                        onClick={() => { setTopUpModalOpen(false); setTopUpAmount(""); }}
                        className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
                      >
                        &times;
                      </button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Select an amount or enter a custom value. You will be redirected to Stripe to complete the payment.
                    </p>

                    <div className="grid grid-cols-4 gap-2">
                      {[10, 25, 50, 100].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => setTopUpAmount(preset)}
                          className={cn(
                            "rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                            topUpAmount === preset
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-foreground hover:border-primary/50"
                          )}
                        >
                          ${preset}
                        </button>
                      ))}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground" htmlFor="custom-topup-amount">
                        Custom amount
                      </label>
                      <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        <input
                          id="custom-topup-amount"
                          type="number"
                          min={1}
                          step={1}
                          value={topUpAmount === "" ? "" : topUpAmount}
                          onChange={(e) => setTopUpAmount(e.target.value ? Number(e.target.value) : "")}
                          placeholder="Enter amount"
                          className="w-full rounded-lg border border-border bg-background py-2 pl-7 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => { setTopUpModalOpen(false); setTopUpAmount(""); }}
                        className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          if (typeof topUpAmount === "number" && topUpAmount > 0) {
                            handleTopUp(topUpAmount);
                          }
                        }}
                        disabled={topUpLoading || topUpAmount === "" || (typeof topUpAmount === "number" && topUpAmount <= 0)}
                        className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {topUpLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        ) : (
                          `Pay ${typeof topUpAmount === "number" && topUpAmount > 0 ? `$${topUpAmount.toFixed(2)}` : "..."}`
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
