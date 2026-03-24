"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Shield,
  Phone,
  Mail,
  Bot,
  CreditCard,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  RefreshCw,
  AlertTriangle,
  BarChart3,
  Users,
  PhoneCall,
  DollarSign,
  Trash2,
  Zap,
  Plug,
  Facebook,
  Instagram,
  Globe,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { apiClient, tryFetch } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConnectionStatus {
  connected: boolean;
  message: string;
  lastTested: string | null;
}

interface AdminSettings {
  twilio: {
    accountSid: string;
    authToken: string;
  };
  resend: {
    apiKey: string;
  };
  anthropic: {
    apiKey: string;
  };
  stripe: {
    secretKey: string;
    webhookSecret: string;
  };
  oauth: {
    facebookAppId: string;
    facebookAppSecret: string;
    googleClientId: string;
    googleClientSecret: string;
    quickbooksClientId: string;
    quickbooksClientSecret: string;
  };
}

interface PlatformStats {
  totalOrgs: number;
  totalPhoneNumbers: number;
  totalEmailsSent: number;
  totalAiCalls: number;
  mrr: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ADMIN_SETTINGS_KEY = "mybizos_admin_settings";
const ADMIN_STATUS_KEY = "mybizos_admin_status";

function loadAdminSettings(): AdminSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(ADMIN_SETTINGS_KEY);
    if (!raw) return defaultSettings;
    return JSON.parse(raw) as AdminSettings;
  } catch {
    return defaultSettings;
  }
}

function saveAdminSettings(settings: AdminSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(settings));
}

function loadStatuses(): Record<string, ConnectionStatus> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ADMIN_STATUS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, ConnectionStatus>;
  } catch {
    return {};
  }
}

function saveStatuses(statuses: Record<string, ConnectionStatus>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ADMIN_STATUS_KEY, JSON.stringify(statuses));
}

const defaultSettings: AdminSettings = {
  twilio: { accountSid: "", authToken: "" },
  resend: { apiKey: "" },
  anthropic: { apiKey: "" },
  stripe: { secretKey: "", webhookSecret: "" },
  oauth: {
    facebookAppId: "",
    facebookAppSecret: "",
    googleClientId: "",
    googleClientSecret: "",
    quickbooksClientId: "",
    quickbooksClientSecret: "",
  },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ConnectionStatus | undefined }) {
  if (!status) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        <XCircle className="h-3 w-3" />
        Not Connected
      </span>
    );
  }
  if (status.connected) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600">
        <CheckCircle2 className="h-3 w-3" />
        Connected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
      <XCircle className="h-3 w-3" />
      Not Connected
    </span>
  );
}

function SecretInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors font-mono"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminSettingsPage() {
  usePageTitle("Platform Settings");

  const [settings, setSettings] = useState<AdminSettings>(defaultSettings);
  const [statuses, setStatuses] = useState<Record<string, ConnectionStatus>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const stats: PlatformStats = {
    totalOrgs: 1,
    totalPhoneNumbers: 0,
    totalEmailsSent: 0,
    totalAiCalls: 0,
    mrr: 0,
  };

  useEffect(() => {
    setSettings(loadAdminSettings());
    setStatuses(loadStatuses());
    setHydrated(true);
  }, []);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Save handler ──

  function handleSave(section: string) {
    setSaving(section);
    saveAdminSettings(settings);

    // Also try to persist to API
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    fetch(`${API_BASE}/admin/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, settings }),
    }).catch(() => {
      // API might not be running — that's fine, localStorage is the fallback
    });

    setTimeout(() => {
      setSaving(null);
      showToast(`${section} settings saved`);
    }, 500);
  }

  // ── Test handlers ──

  async function handleTestTwilio() {
    if (!settings.twilio.accountSid || !settings.twilio.authToken) {
      showToast("Please enter Twilio credentials first", "error");
      return;
    }
    setTesting("twilio");
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const res = await fetch(`${API_BASE}/admin/test/twilio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountSid: settings.twilio.accountSid,
          authToken: settings.twilio.authToken,
        }),
      });
      const data = await res.json();
      const status: ConnectionStatus = {
        connected: data.success ?? false,
        message: data.message ?? (data.success ? "Connected" : "Failed"),
        lastTested: new Date().toISOString(),
      };
      const updated = { ...statuses, twilio: status };
      setStatuses(updated);
      saveStatuses(updated);
      showToast(status.connected ? "Twilio connected!" : "Twilio test failed", status.connected ? "success" : "error");
    } catch {
      const status: ConnectionStatus = {
        connected: false,
        message: "API unreachable — credentials saved locally",
        lastTested: new Date().toISOString(),
      };
      const updated = { ...statuses, twilio: status };
      setStatuses(updated);
      saveStatuses(updated);
      showToast("API offline — credentials saved locally", "error");
    }
    setTesting(null);
  }

  async function handleTestResend() {
    if (!settings.resend.apiKey) {
      showToast("Please enter Resend API key first", "error");
      return;
    }
    setTesting("resend");
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const res = await fetch(`${API_BASE}/admin/test/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: settings.resend.apiKey }),
      });
      const data = await res.json();
      const status: ConnectionStatus = {
        connected: data.success ?? false,
        message: data.message ?? "Tested",
        lastTested: new Date().toISOString(),
      };
      const updated = { ...statuses, resend: status };
      setStatuses(updated);
      saveStatuses(updated);
      showToast(status.connected ? "Resend connected!" : "Resend test failed", status.connected ? "success" : "error");
    } catch {
      const status: ConnectionStatus = {
        connected: false,
        message: "API unreachable",
        lastTested: new Date().toISOString(),
      };
      const updated = { ...statuses, resend: status };
      setStatuses(updated);
      saveStatuses(updated);
      showToast("API offline — credentials saved locally", "error");
    }
    setTesting(null);
  }

  async function handleTestAnthropic() {
    if (!settings.anthropic.apiKey) {
      showToast("Please enter Anthropic API key first", "error");
      return;
    }
    setTesting("anthropic");
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
      const res = await fetch(`${API_BASE}/admin/test/anthropic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: settings.anthropic.apiKey }),
      });
      const data = await res.json();
      const status: ConnectionStatus = {
        connected: data.success ?? false,
        message: data.message ?? "Tested",
        lastTested: new Date().toISOString(),
      };
      const updated = { ...statuses, anthropic: status };
      setStatuses(updated);
      saveStatuses(updated);
      showToast(status.connected ? "Anthropic connected!" : "Anthropic test failed", status.connected ? "success" : "error");
    } catch {
      const status: ConnectionStatus = {
        connected: false,
        message: "API unreachable",
        lastTested: new Date().toISOString(),
      };
      const updated = { ...statuses, anthropic: status };
      setStatuses(updated);
      saveStatuses(updated);
      showToast("API offline — credentials saved locally", "error");
    }
    setTesting(null);
  }

  // ── Danger zone ──

  function handleResetDemo() {
    if (!window.confirm("Reset all demo data? This clears onboarding, settings, and admin config from localStorage.")) {
      return;
    }
    localStorage.removeItem("mybizos_onboarding");
    localStorage.removeItem("mybizos_settings");
    localStorage.removeItem(ADMIN_SETTINGS_KEY);
    localStorage.removeItem(ADMIN_STATUS_KEY);
    setSettings(defaultSettings);
    setStatuses({});
    showToast("All demo data cleared");
  }

  function handleClearSettings() {
    if (!window.confirm("Clear all platform API keys? You will need to re-enter them.")) {
      return;
    }
    localStorage.removeItem(ADMIN_SETTINGS_KEY);
    localStorage.removeItem(ADMIN_STATUS_KEY);
    setSettings(defaultSettings);
    setStatuses({});
    showToast("Platform settings cleared");
  }

  if (!hydrated) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-top-2",
            toast.type === "success" ? "bg-emerald-600" : "bg-destructive",
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Platform Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage API keys and platform configuration. These power the system for all customers.
            </p>
          </div>
        </div>
      </div>

      {/* ── API Connections ── */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          API Connections
        </h2>

        {/* Twilio */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                <Phone className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Twilio Master Account</h3>
                <p className="text-xs text-muted-foreground">Voice, SMS, and phone number provisioning</p>
              </div>
            </div>
            <StatusBadge status={statuses.twilio} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SecretInput
              label="Account SID"
              value={settings.twilio.accountSid}
              onChange={(v) =>
                setSettings((s) => ({ ...s, twilio: { ...s.twilio, accountSid: v } }))
              }
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <SecretInput
              label="Auth Token"
              value={settings.twilio.authToken}
              onChange={(v) =>
                setSettings((s) => ({ ...s, twilio: { ...s.twilio, authToken: v } }))
              }
              placeholder="Your Twilio auth token"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave("twilio")}
              disabled={saving === "twilio"}
              className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving === "twilio" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
            <button
              type="button"
              onClick={handleTestTwilio}
              disabled={testing === "twilio"}
              className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              {testing === "twilio" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Test Connection
            </button>
          </div>
        </div>

        {/* Resend */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <Mail className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Resend</h3>
                <p className="text-xs text-muted-foreground">Email delivery for notifications and campaigns</p>
              </div>
            </div>
            <StatusBadge status={statuses.resend} />
          </div>

          <SecretInput
            label="API Key"
            value={settings.resend.apiKey}
            onChange={(v) =>
              setSettings((s) => ({ ...s, resend: { ...s.resend, apiKey: v } }))
            }
            placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave("resend")}
              disabled={saving === "resend"}
              className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving === "resend" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
            <button
              type="button"
              onClick={handleTestResend}
              disabled={testing === "resend"}
              className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              {testing === "resend" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Test Connection
            </button>
          </div>
        </div>

        {/* Anthropic */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                <Bot className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Anthropic (Claude)</h3>
                <p className="text-xs text-muted-foreground">AI phone agent, SMS responses, and lead qualification</p>
              </div>
            </div>
            <StatusBadge status={statuses.anthropic} />
          </div>

          <SecretInput
            label="API Key"
            value={settings.anthropic.apiKey}
            onChange={(v) =>
              setSettings((s) => ({ ...s, anthropic: { ...s.anthropic, apiKey: v } }))
            }
            placeholder="sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave("anthropic")}
              disabled={saving === "anthropic"}
              className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving === "anthropic" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
            <button
              type="button"
              onClick={handleTestAnthropic}
              disabled={testing === "anthropic"}
              className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              {testing === "anthropic" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Test Connection
            </button>
          </div>
        </div>

        {/* Stripe */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10">
                <CreditCard className="h-4 w-4 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Stripe</h3>
                <p className="text-xs text-muted-foreground">Payments, subscriptions, and invoicing</p>
              </div>
            </div>
            <StatusBadge status={statuses.stripe} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SecretInput
              label="Secret Key"
              value={settings.stripe.secretKey}
              onChange={(v) =>
                setSettings((s) => ({ ...s, stripe: { ...s.stripe, secretKey: v } }))
              }
              placeholder="Your Stripe secret key"
            />
            <SecretInput
              label="Webhook Secret"
              value={settings.stripe.webhookSecret}
              onChange={(v) =>
                setSettings((s) => ({ ...s, stripe: { ...s.stripe, webhookSecret: v } }))
              }
              placeholder="whsec_xxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSave("stripe")}
              disabled={saving === "stripe"}
              className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving === "stripe" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
          </div>
        </div>
      </div>

      {/* ── OAuth Integration Credentials ── */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Plug className="h-5 w-5 text-primary" />
            OAuth Integration Credentials
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Configure developer credentials for third-party OAuth integrations.
            Org owners use these to connect their accounts in the Integrations page.
          </p>
        </div>

        {/* Meta (Facebook / Instagram) */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <Facebook className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Meta (Facebook / Instagram)</h3>
                <p className="text-xs text-muted-foreground">Social media posting and messaging</p>
              </div>
            </div>
            <a
              href="https://developers.facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Developer Portal
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="rounded-lg bg-blue-50/50 border border-blue-100 p-3">
            <p className="text-xs text-blue-700">
              Create a Meta App at developers.facebook.com. Enable Facebook Login and add
              pages_manage_posts, pages_messaging, instagram_basic, and instagram_content_publish
              as permissions.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SecretInput
              label="Facebook App ID"
              value={settings.oauth.facebookAppId}
              onChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  oauth: { ...s.oauth, facebookAppId: v },
                }))
              }
              placeholder="123456789012345"
            />
            <SecretInput
              label="Facebook App Secret"
              value={settings.oauth.facebookAppSecret}
              onChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  oauth: { ...s.oauth, facebookAppSecret: v },
                }))
              }
              placeholder="abcdef1234567890abcdef1234567890"
            />
          </div>

          <button
            type="button"
            onClick={async () => {
              saveAdminSettings(settings);
              // Sync to API backend
              try {
                await tryFetch(() =>
                  apiClient.post("/orgs/demo/integrations/admin/credentials", {
                    credentials: [
                      { key: "FACEBOOK_APP_ID", value: settings.oauth.facebookAppId },
                      { key: "FACEBOOK_APP_SECRET", value: settings.oauth.facebookAppSecret },
                    ],
                  }),
                );
              } catch { /* API offline — saved locally */ }
              showToast("Meta credentials saved!");
            }}
            className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            Save Meta Credentials
          </button>
        </div>

        {/* Google */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
                <Globe className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Google (GBP, Ads, Analytics, Calendar)</h3>
                <p className="text-xs text-muted-foreground">Business Profile, Ads, Analytics, Calendar</p>
              </div>
            </div>
            <a
              href="https://console.cloud.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Cloud Console
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="rounded-lg bg-emerald-50/50 border border-emerald-100 p-3">
            <p className="text-xs text-emerald-700">
              Create a Google Cloud project. Enable the Google Business Profile, Google Ads,
              Analytics, and Calendar APIs. Create OAuth 2.0 credentials (Web application type)
              and add your redirect URIs.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SecretInput
              label="Google Client ID"
              value={settings.oauth.googleClientId}
              onChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  oauth: { ...s.oauth, googleClientId: v },
                }))
              }
              placeholder="xxxxx.apps.googleusercontent.com"
            />
            <SecretInput
              label="Google Client Secret"
              value={settings.oauth.googleClientSecret}
              onChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  oauth: { ...s.oauth, googleClientSecret: v },
                }))
              }
              placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>

          <button
            type="button"
            onClick={async () => {
              saveAdminSettings(settings);
              try {
                await tryFetch(() =>
                  apiClient.post("/orgs/demo/integrations/admin/credentials", {
                    credentials: [
                      { key: "GOOGLE_CLIENT_ID", value: settings.oauth.googleClientId },
                      { key: "GOOGLE_CLIENT_SECRET", value: settings.oauth.googleClientSecret },
                    ],
                  }),
                );
              } catch { /* API offline — saved locally */ }
              showToast("Google credentials saved!");
            }}
            className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            Save Google Credentials
          </button>
        </div>

        {/* QuickBooks */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">QuickBooks (Intuit)</h3>
                <p className="text-xs text-muted-foreground">Accounting, invoicing, and customer sync</p>
              </div>
            </div>
            <a
              href="https://developer.intuit.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Developer Portal
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="rounded-lg bg-green-50/50 border border-green-100 p-3">
            <p className="text-xs text-green-700">
              Create an Intuit Developer account. Register a new app and select the
              QuickBooks Online Accounting scope. Copy your Client ID and Client Secret.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SecretInput
              label="Intuit Client ID"
              value={settings.oauth.quickbooksClientId}
              onChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  oauth: { ...s.oauth, quickbooksClientId: v },
                }))
              }
              placeholder="ABxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
            <SecretInput
              label="Intuit Client Secret"
              value={settings.oauth.quickbooksClientSecret}
              onChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  oauth: { ...s.oauth, quickbooksClientSecret: v },
                }))
              }
              placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            />
          </div>

          <button
            type="button"
            onClick={async () => {
              saveAdminSettings(settings);
              try {
                await tryFetch(() =>
                  apiClient.post("/orgs/demo/integrations/admin/credentials", {
                    credentials: [
                      { key: "QUICKBOOKS_CLIENT_ID", value: settings.oauth.quickbooksClientId },
                      { key: "QUICKBOOKS_CLIENT_SECRET", value: settings.oauth.quickbooksClientSecret },
                    ],
                  }),
                );
              } catch { /* API offline — saved locally */ }
              showToast("QuickBooks credentials saved!");
            }}
            className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Save className="h-3.5 w-3.5" />
            Save QuickBooks Credentials
          </button>
        </div>
      </div>

      {/* ── Platform Stats ── */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Platform Stats
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatCard label="Total Customers" value={stats.totalOrgs} icon={Users} />
          <StatCard label="Phone Numbers" value={stats.totalPhoneNumbers} icon={PhoneCall} />
          <StatCard label="Emails Sent" value={stats.totalEmailsSent} icon={Mail} />
          <StatCard label="AI Calls" value={stats.totalAiCalls} icon={Bot} />
          <StatCard label="MRR" value={`$${stats.mrr}`} icon={DollarSign} />
        </div>
      </div>

      {/* ── Danger Zone ── */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-destructive flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Danger Zone
        </h2>
        <div className="rounded-xl border-2 border-destructive/20 bg-destructive/5 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Reset Demo Data</p>
              <p className="text-xs text-muted-foreground">
                Clear onboarding, settings, and return to initial state.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetDemo}
              className="flex h-9 items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
          <div className="h-px bg-destructive/10" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Clear All Settings</p>
              <p className="text-xs text-muted-foreground">
                Remove all API keys. You&apos;ll need to re-enter them.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearSettings}
              className="flex h-9 items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
