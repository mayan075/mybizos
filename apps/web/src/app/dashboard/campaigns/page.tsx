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
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { useCampaigns, type Campaign } from "@/lib/hooks/use-campaigns";

// ── Helpers ──

type TabFilter = "all" | "draft" | "sent" | "scheduled";

const statusConfig: Record<
  Campaign["status"],
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

function StatusBadge({ status }: { status: Campaign["status"] }) {
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

  const { data: campaignsData, isLoading } = useCampaigns({ search });
  const campaigns = Array.isArray(campaignsData) ? campaignsData : [];

  const filtered = useMemo(() => {
    let result = campaigns;

    // Tab filter
    if (activeTab !== "all") {
      result = result.filter((c) => c.status === activeTab);
    }

    // Search is handled server-side via the hook, but filter locally for tab
    return result;
  }, [campaigns, activeTab]);

  const tabCounts = useMemo(() => {
    return {
      all: campaigns.length,
      draft: campaigns.filter((c) => c.status === "draft").length,
      sent: campaigns.filter((c) => c.status === "sent").length,
      scheduled: campaigns.filter((c) => c.status === "scheduled").length,
    };
  }, [campaigns]);

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

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Campaign cards */}
      {!isLoading && <div className="grid gap-4">
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
              {campaign.status === "sent" && campaign.stats && (
                <div className="flex items-center gap-6 ml-6 shrink-0">
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                      <Send className="h-3 w-3" />
                      Sent
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {campaign.stats.sent.toLocaleString()}
                    </p>
                  </div>
                  {campaign.type === "email" && (
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                        <Eye className="h-3 w-3" />
                        Opens
                      </div>
                      <p className="text-sm font-semibold text-foreground">
                        {campaign.stats.sent > 0
                          ? ((campaign.stats.opened / campaign.stats.sent) * 100).toFixed(1)
                          : "0.0"}%
                      </p>
                    </div>
                  )}
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                      <MousePointerClick className="h-3 w-3" />
                      Clicks
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {campaign.stats.sent > 0
                        ? ((campaign.stats.clicked / campaign.stats.sent) * 100).toFixed(1)
                        : "0.0"}%
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
                      <AlertTriangle className="h-3 w-3" />
                      Bounced
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {campaign.stats.sent > 0
                        ? ((campaign.stats.bounced / campaign.stats.sent) * 100).toFixed(1)
                        : "0.0"}%
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
              {search ? "No campaigns found" : "No campaigns yet"}
            </p>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              {search
                ? `No results matching "${search}". Try a different search term.`
                : "Create your first campaign to reach your customers."}
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
      </div>}
    </div>
  );
}
