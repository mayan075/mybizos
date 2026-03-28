"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plug,
  Facebook,
  Instagram,
  MapPin,
  BarChart3,
  Calendar,
  CreditCard,
  Zap,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Globe,
  Key,
  Webhook,
  Copy,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { apiClient, tryFetch } from "@/lib/api-client";
import { env } from "@/lib/env";

// ─── Types ──────────────────────────────────────────────────────────────────

type OAuthProvider =
  | "facebook"
  | "instagram"
  | "google_business"
  | "google_ads"
  | "google_analytics"
  | "google_calendar"
  | "quickbooks"
  | "stripe";

interface ConnectionStatus {
  connected: boolean;
  provider: OAuthProvider;
  accountName: string | null;
  accountId: string | null;
  connectedAt: string | null;
  expiresAt: string | null;
  credentialsConfigured: boolean;
  displayName: string;
}

interface IntegrationCard {
  provider: OAuthProvider;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  features: string[];
  category: "social" | "google" | "business";
  developerUrl: string;
  credentialLabel: string;
}

// ─── Integration Cards Config ───────────────────────────────────────────────

const INTEGRATION_CARDS: IntegrationCard[] = [
  {
    provider: "facebook",
    name: "Facebook Pages",
    description: "Post to your page, respond to messages, run ads",
    icon: Facebook,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    features: [
      "Post updates to your Facebook Page",
      "Respond to page messages",
      "View post engagement and insights",
    ],
    category: "social",
    developerUrl: "https://developers.facebook.com",
    credentialLabel: "Meta (Facebook/Instagram)",
  },
  {
    provider: "instagram",
    name: "Instagram Business",
    description: "Post photos, respond to DMs, view insights",
    icon: Instagram,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
    borderColor: "border-pink-200",
    features: [
      "Publish photos and carousels",
      "Respond to Instagram DMs",
      "View story and post insights",
    ],
    category: "social",
    developerUrl: "https://developers.facebook.com",
    credentialLabel: "Meta (Facebook/Instagram)",
  },
  {
    provider: "google_business",
    name: "Google Business Profile",
    description: "Manage reviews, update hours, post updates",
    icon: MapPin,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    features: [
      "Respond to Google reviews",
      "Update business hours and info",
      "Post updates and offers",
    ],
    category: "google",
    developerUrl: "https://console.cloud.google.com",
    credentialLabel: "Google",
  },
  {
    provider: "google_ads",
    name: "Google Ads",
    description: "Track ad spend, see which ads bring leads",
    icon: TrendingUp,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    features: [
      "Track ad campaign performance",
      "See which ads bring in leads",
      "Monitor cost per acquisition",
    ],
    category: "google",
    developerUrl: "https://console.cloud.google.com",
    credentialLabel: "Google",
  },
  {
    provider: "google_analytics",
    name: "Google Analytics",
    description: "Track website visitors and conversions",
    icon: BarChart3,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    features: [
      "Track website traffic in real-time",
      "Monitor conversion funnels",
      "See traffic sources and campaigns",
    ],
    category: "google",
    developerUrl: "https://console.cloud.google.com",
    credentialLabel: "Google",
  },
  {
    provider: "google_calendar",
    name: "Google Calendar",
    description: "Sync appointments bidirectionally",
    icon: Calendar,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    features: [
      "Two-way appointment sync",
      "Auto-block calendar when booked",
      "Booking link integration",
    ],
    category: "google",
    developerUrl: "https://console.cloud.google.com",
    credentialLabel: "Google",
  },
  {
    provider: "quickbooks",
    name: "QuickBooks",
    description: "Sync invoices, payments, and customers",
    icon: Globe,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    features: [
      "Sync invoices automatically",
      "Track payments and receivables",
      "Sync customer records",
    ],
    category: "business",
    developerUrl: "https://developer.intuit.com",
    credentialLabel: "QuickBooks (Intuit)",
  },
  {
    provider: "stripe",
    name: "Stripe",
    description: "Accept payments, send invoices",
    icon: CreditCard,
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    features: [
      "Accept online payments",
      "Send professional invoices",
      "Real-time payment tracking",
    ],
    category: "business",
    developerUrl: "https://dashboard.stripe.com/developers",
    credentialLabel: "Stripe",
  },
];

// ─── Constants ──────────────────────────────────────────────────────────────

const ORG_ID = "demo"; // Use demo org in development

// ─── Main Component ─────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  usePageTitle("Integrations");
  const searchParams = useSearchParams();

  const [statuses, setStatuses] = useState<Record<string, ConnectionStatus>>({});
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<OAuthProvider | null>(null);
  const toast = useToast();
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Zapier config (displayed as-is, not OAuth)
  const zapierApiKey = "mbos_demo_zap_key_xxxxxxxx";
  const zapierWebhookUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/zapier`;

  // Check URL params for connection results
  useEffect(() => {
    const connected = searchParams.get("connected");
    const connectedName = searchParams.get("name");
    const error = searchParams.get("error");
    const errorProvider = searchParams.get("provider");

    if (connected && connectedName) {
      toast.success(`${connectedName} connected successfully!`);
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/integrations");
    }
    if (error) {
      toast.error(
        `Failed to connect ${errorProvider ?? "integration"}: ${error}`,
      );
      window.history.replaceState({}, "", "/dashboard/integrations");
    }
  }, [searchParams]);

  // Fetch connection statuses
  const fetchStatuses = useCallback(async () => {
    setLoading(true);
    try {
      const result = await tryFetch(() =>
        apiClient.get<{ status: Record<string, ConnectionStatus> }>(
          `/orgs/${ORG_ID}/integrations/status`,
        ),
      );
      if (result) {
        setStatuses(result.status);
      }
    } catch {
      // Silently handle — we'll show "not connected" for all
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  // Connect handler — redirect to OAuth
  function handleConnect(provider: OAuthProvider) {
    const status = statuses[provider];

    if (status && !status.credentialsConfigured) {
      const card = INTEGRATION_CARDS.find((c) => c.provider === provider);
      toast.error(
        `${card?.credentialLabel ?? provider} credentials not configured. Ask your MyBizOS admin to configure them in Admin Settings.`,
      );
      return;
    }

    // Redirect to the API OAuth start endpoint
    window.location.href = `${env.NEXT_PUBLIC_API_URL}/orgs/${ORG_ID}/integrations/${provider}/auth`;
  }

  // Disconnect handler
  async function handleDisconnect(provider: OAuthProvider) {
    setDisconnecting(provider);
    try {
      await apiClient.delete(`/orgs/${ORG_ID}/integrations/${provider}`);
      toast.success(`${INTEGRATION_CARDS.find((c) => c.provider === provider)?.name ?? provider} disconnected`);
      await fetchStatuses();
    } catch {
      toast.error("Failed to disconnect. Please try again.");
    } finally {
      setDisconnecting(null);
    }
  }

  function handleCopyWebhook() {
    navigator.clipboard.writeText(zapierWebhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  }

  // Separate connected and available integrations
  const connectedIntegrations = INTEGRATION_CARDS.filter(
    (card) => statuses[card.provider]?.connected,
  );
  const availableIntegrations = INTEGRATION_CARDS.filter(
    (card) => !statuses[card.provider]?.connected,
  );

  // Group available by category
  const socialIntegrations = availableIntegrations.filter((c) => c.category === "social");
  const googleIntegrations = availableIntegrations.filter((c) => c.category === "google");
  const businessIntegrations = availableIntegrations.filter((c) => c.category === "business");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Plug className="h-6 w-6 text-primary" />
            Integrations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect your tools and services to power your business from one place.
          </p>
        </div>
        <button
          onClick={fetchStatuses}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Connected Services */}
      {connectedIntegrations.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            Connected Services
            <span className="text-xs font-normal text-muted-foreground">
              ({connectedIntegrations.length})
            </span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {connectedIntegrations.map((card) => {
              const status = statuses[card.provider];
              const Icon = card.icon;
              return (
                <div
                  key={card.provider}
                  className={cn(
                    "rounded-xl border-2 bg-card p-5 transition-shadow hover:shadow-md",
                    card.borderColor,
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-xl",
                          card.bgColor,
                        )}
                      >
                        <Icon className={cn("h-5 w-5", card.color)} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {card.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {status?.accountName ?? "Connected"}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Connected
                    </span>
                  </div>

                  {status?.connectedAt && (
                    <p className="text-[11px] text-muted-foreground mt-3">
                      Connected {new Date(status.connectedAt).toLocaleDateString()}
                    </p>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleDisconnect(card.provider)}
                      disabled={disconnecting === card.provider}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-input px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                    >
                      {disconnecting === card.provider ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <XCircle className="h-3 w-3" />
                      )}
                      Disconnect
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Integrations — Social Media */}
      {socialIntegrations.length > 0 && (
        <IntegrationSection
          title="Social Media"
          description="Connect your social media accounts to post and engage"
          cards={socialIntegrations}
          statuses={statuses}
          onConnect={handleConnect}
          loading={loading}
        />
      )}

      {/* Available Integrations — Google */}
      {googleIntegrations.length > 0 && (
        <IntegrationSection
          title="Google Services"
          description="Connect your Google accounts for analytics, advertising, and more"
          cards={googleIntegrations}
          statuses={statuses}
          onConnect={handleConnect}
          loading={loading}
        />
      )}

      {/* Available Integrations — Business Tools */}
      {businessIntegrations.length > 0 && (
        <IntegrationSection
          title="Business Tools"
          description="Connect accounting, payments, and productivity tools"
          cards={businessIntegrations}
          statuses={statuses}
          onConnect={handleConnect}
          loading={loading}
        />
      )}

      {/* Zapier — Special card */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Automation
        </h2>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50">
              <Zap className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  Zapier
                </h3>
                <span className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
                  5,000+ Apps
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Connect MyBizOS to 5,000+ apps using Zapier. Use your API key and webhook URL below.
              </p>

              <div className="mt-4 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Key className="h-3 w-3 text-muted-foreground" />
                    API Key
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={zapierApiKey}
                      className="h-9 flex-1 rounded-lg border border-input bg-muted/50 px-3 text-xs font-mono text-muted-foreground"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(zapierApiKey);
                        toast.success("API key copied!");
                      }}
                      className="flex h-9 items-center gap-1.5 rounded-lg border border-input px-3 text-xs text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Webhook className="h-3 w-3 text-muted-foreground" />
                    Webhook URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={zapierWebhookUrl}
                      className="h-9 flex-1 rounded-lg border border-input bg-muted/50 px-3 text-xs font-mono text-muted-foreground"
                    />
                    <button
                      onClick={handleCopyWebhook}
                      className="flex h-9 items-center gap-1.5 rounded-lg border border-input px-3 text-xs text-muted-foreground hover:bg-muted transition-colors"
                    >
                      {copiedWebhook ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copiedWebhook ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>

              <a
                href="https://zapier.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 mt-4 text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors"
              >
                Open Zapier
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Setup Note */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">
              Admin Setup Required
            </p>
            <p className="text-xs text-amber-700 mt-1">
              OAuth integrations require developer credentials from each platform.
              Go to{" "}
              <Link
                href="/dashboard/admin/settings"
                className="font-medium underline hover:text-amber-900"
              >
                Admin Settings
              </Link>{" "}
              to configure your Facebook App ID, Google Client ID, and other credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section Component ──────────────────────────────────────────────────────

function IntegrationSection({
  title,
  description,
  cards,
  statuses,
  onConnect,
  loading,
}: {
  title: string;
  description: string;
  cards: IntegrationCard[];
  statuses: Record<string, ConnectionStatus>;
  onConnect: (provider: OAuthProvider) => void;
  loading: boolean;
}) {
  return (
    <div>
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <IntegrationCardComponent
            key={card.provider}
            card={card}
            status={statuses[card.provider]}
            onConnect={() => onConnect(card.provider)}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Card Component ─────────────────────────────────────────────────────────

function IntegrationCardComponent({
  card,
  status,
  onConnect,
  loading,
}: {
  card: IntegrationCard;
  status: ConnectionStatus | undefined;
  onConnect: () => void;
  loading: boolean;
}) {
  const Icon = card.icon;
  const credentialsConfigured = status?.credentialsConfigured ?? false;

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md group">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl shrink-0",
            card.bgColor,
          )}
        >
          <Icon className={cn("h-5 w-5", card.color)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{card.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {card.description}
          </p>
        </div>
      </div>

      {/* Features */}
      <ul className="mt-3 space-y-1">
        {card.features.map((feature, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-[11px] text-muted-foreground"
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
            {feature}
          </li>
        ))}
      </ul>

      {/* Connect Button or Status */}
      <div className="mt-4">
        {!credentialsConfigured && !loading ? (
          <div className="space-y-2">
            <p className="text-[11px] text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Credentials not configured
            </p>
            <Link
              href="/dashboard/admin/settings"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
            >
              <Key className="h-3.5 w-3.5" />
              Configure in Admin Settings
            </Link>
          </div>
        ) : (
          <button
            onClick={onConnect}
            disabled={loading}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold transition-all",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "group-hover:shadow-sm",
              loading && "opacity-50 cursor-not-allowed",
            )}
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plug className="h-3.5 w-3.5" />
            )}
            Connect {card.name}
          </button>
        )}
      </div>
    </div>
  );
}
