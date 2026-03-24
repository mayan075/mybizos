"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Send,
  Clock,
  FileEdit,
  XCircle,
  Eye,
  MousePointerClick,
  AlertTriangle,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";

// ── Mock Data ──

interface MockCampaign {
  id: string;
  name: string;
  type: "email" | "sms";
  status: "draft" | "scheduled" | "sending" | "sent" | "cancelled";
  subject: string | null;
  sentCount: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

const mockCampaigns: MockCampaign[] = [
  {
    id: "camp-1",
    name: "Spring Cleanout Special",
    type: "email",
    status: "sent",
    subject: "Get 20% off your spring cleanout!",
    sentCount: 842,
    openRate: 34.2,
    clickRate: 8.7,
    bounceRate: 1.2,
    scheduledAt: null,
    sentAt: "2026-03-15T10:00:00Z",
    createdAt: "2026-03-14T08:30:00Z",
  },
  {
    id: "camp-2",
    name: "Same-Day Pickup Reminder",
    type: "sms",
    status: "sent",
    subject: null,
    sentCount: 1205,
    openRate: 0,
    clickRate: 4.1,
    bounceRate: 0.5,
    scheduledAt: null,
    sentAt: "2026-03-10T14:00:00Z",
    createdAt: "2026-03-09T11:00:00Z",
  },
  {
    id: "camp-3",
    name: "New Customer Welcome Series",
    type: "email",
    status: "scheduled",
    subject: "Welcome to Northern Removals — Here's what to expect",
    sentCount: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
    scheduledAt: "2026-03-25T09:00:00Z",
    sentAt: null,
    createdAt: "2026-03-18T15:30:00Z",
  },
  {
    id: "camp-4",
    name: "Summer AC Check Promo",
    type: "email",
    status: "draft",
    subject: "Beat the heat — book your AC check today",
    sentCount: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
    scheduledAt: null,
    sentAt: null,
    createdAt: "2026-03-20T09:15:00Z",
  },
  {
    id: "camp-5",
    name: "Appointment Reminder",
    type: "sms",
    status: "sent",
    subject: null,
    sentCount: 328,
    openRate: 0,
    clickRate: 12.5,
    bounceRate: 0.3,
    scheduledAt: null,
    sentAt: "2026-03-12T08:00:00Z",
    createdAt: "2026-03-11T16:00:00Z",
  },
  {
    id: "camp-6",
    name: "Monthly Newsletter — March",
    type: "email",
    status: "sent",
    subject: "Your March home maintenance tips",
    sentCount: 1547,
    openRate: 28.6,
    clickRate: 5.3,
    bounceRate: 2.1,
    scheduledAt: null,
    sentAt: "2026-03-01T10:00:00Z",
    createdAt: "2026-02-28T14:00:00Z",
  },
  {
    id: "camp-7",
    name: "Referral Program Launch",
    type: "email",
    status: "draft",
    subject: "Refer a friend, get $50 off!",
    sentCount: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
    scheduledAt: null,
    sentAt: null,
    createdAt: "2026-03-21T10:00:00Z",
  },
  {
    id: "camp-8",
    name: "Holiday Hours Notice",
    type: "sms",
    status: "cancelled",
    subject: null,
    sentCount: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0,
    scheduledAt: null,
    sentAt: null,
    createdAt: "2026-03-05T09:00:00Z",
  },
];

// ── Helpers ──

type TabFilter = "all" | "draft" | "sent" | "scheduled";

const statusConfig: Record<
  MockCampaign["status"],
  { label: string; icon: React.ElementType; className: string }
> = {
  draft: {
    label: "Draft",
    icon: FileEdit,
    className: "bg-muted text-muted-foreground",
  },
  scheduled: {
    label: "Scheduled",
    icon: Clock,
    className: "bg-info/10 text-info",
  },
  sending: {
    label: "Sending",
    icon: Send,
    className: "bg-warning/10 text-warning",
  },
  sent: {
    label: "Sent",
    icon: Send,
    className: "bg-success/10 text-success",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className: "bg-destructive/10 text-destructive",
  },
};

function StatusBadge({ status }: { status: MockCampaign["status"] }) {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        cfg.className,
      )}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }: { type: "email" | "sms" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        type === "email"
          ? "bg-primary/10 text-primary"
          : "bg-accent text-accent-foreground",
      )}
    >
      {type === "email" ? (
        <Mail className="h-3 w-3" />
      ) : (
        <MessageSquare className="h-3 w-3" />
      )}
      {type === "email" ? "Email" : "SMS"}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Page ──

export default function CampaignsPage() {
  usePageTitle("Campaigns");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  const filtered = useMemo(() => {
    let result = mockCampaigns;

    // Tab filter
    if (activeTab !== "all") {
      result = result.filter((c) => c.status === activeTab);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.subject && c.subject.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [search, activeTab]);

  const tabCounts = useMemo(() => {
    return {
      all: mockCampaigns.length,
      draft: mockCampaigns.filter((c) => c.status === "draft").length,
      sent: mockCampaigns.filter((c) => c.status === "sent").length,
      scheduled: mockCampaigns.filter((c) => c.status === "scheduled").length,
    };
  }, []);

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: tabCounts.all },
    { key: "draft", label: "Draft", count: tabCounts.draft },
    { key: "sent", label: "Sent", count: tabCounts.sent },
    { key: "scheduled", label: "Scheduled", count: tabCounts.scheduled },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage email and SMS campaigns
          </p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg px-4",
            "bg-primary text-primary-foreground text-sm font-medium",
            "hover:bg-primary/90 transition-colors",
          )}
        >
          <Plus className="h-4 w-4" />
          Create Campaign
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
      </div>

      {/* Campaign cards */}
      <div className="grid gap-4">
        {filtered.map((campaign) => (
          <Link
            key={campaign.id}
            href={`/dashboard/campaigns/${campaign.id}`}
            className="block rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {campaign.name}
                  </h3>
                  <TypeBadge type={campaign.type} />
                  <StatusBadge status={campaign.status} />
                </div>
                {campaign.subject && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    Subject: {campaign.subject}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {campaign.sentAt
                    ? `Sent ${formatDate(campaign.sentAt)}`
                    : campaign.scheduledAt
                      ? `Scheduled for ${formatDate(campaign.scheduledAt)}`
                      : `Created ${formatDate(campaign.createdAt)}`}
                </p>
              </div>

              {/* Stats — only show for sent campaigns */}
              {campaign.status === "sent" && (
                <div className="flex items-center gap-6 ml-6 shrink-0">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                      <Send className="h-3 w-3" />
                      Sent
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {campaign.sentCount.toLocaleString()}
                    </p>
                  </div>
                  {campaign.type === "email" && (
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                        <Eye className="h-3 w-3" />
                        Opens
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {campaign.openRate}%
                      </p>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                      <MousePointerClick className="h-3 w-3" />
                      Clicks
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {campaign.clickRate}%
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                      <AlertTriangle className="h-3 w-3" />
                      Bounced
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {campaign.bounceRate}%
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ml-3"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>
          </Link>
        ))}

        {filtered.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <div className="relative mx-auto mb-4 w-fit">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 border border-primary/10">
                <Megaphone className="h-8 w-8 text-primary/40" />
              </div>
              <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-primary/10" />
              <div className="absolute -left-2 bottom-0 h-2 w-2 rounded-full bg-primary/10" />
            </div>
            <p className="text-lg font-semibold text-foreground mb-2">
              {search ? "No campaigns found" : "Send your first campaign"}
            </p>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              {search
                ? `No results matching "${search}". Try a different search term.`
                : "Reach your customers with SMS or email campaigns. Send promotions, reminders, and updates to grow your business."}
            </p>
            <Link
              href="/dashboard/campaigns/new"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Campaign
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
