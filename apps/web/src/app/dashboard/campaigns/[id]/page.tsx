"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Send,
  Eye,
  MousePointerClick,
  AlertTriangle,
  Users,
  CheckCircle2,
  Clock,
  FileEdit,
  XCircle,
  UserMinus,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Mock Data ──

interface MockCampaignDetail {
  id: string;
  name: string;
  type: "email" | "sms";
  status: "draft" | "scheduled" | "sending" | "sent" | "cancelled";
  subject: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  stats: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  };
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

interface MockRecipient {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: "pending" | "sent" | "delivered" | "opened" | "clicked" | "bounced" | "unsubscribed";
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
}

// Real campaign data will come from the API
const mockCampaigns: Record<string, MockCampaignDetail> = {};
const mockRecipients: MockRecipient[] = [];
// ── Helpers ──

const recipientStatusConfig: Record<
  MockRecipient["status"],
  { label: string; icon: React.ElementType; className: string }
> = {
  pending: { label: "Pending", icon: Clock, className: "text-muted-foreground" },
  sent: { label: "Sent", icon: Send, className: "text-info" },
  delivered: { label: "Delivered", icon: CheckCircle2, className: "text-primary" },
  opened: { label: "Opened", icon: Eye, className: "text-success" },
  clicked: { label: "Clicked", icon: MousePointerClick, className: "text-success" },
  bounced: { label: "Bounced", icon: AlertTriangle, className: "text-destructive" },
  unsubscribed: { label: "Unsubscribed", icon: UserMinus, className: "text-warning" },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatCard({
  label,
  value,
  icon: Icon,
  subValue,
  className,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  subValue?: string;
  className?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("h-4 w-4", className ?? "text-muted-foreground")} />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-foreground">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      {subValue && (
        <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
      )}
    </div>
  );
}

function RateBar({ label, rate, color }: { label: string; rate: number; color: string }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold text-foreground">{rate.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ── Draft View ──

function DraftView({ campaign }: { campaign: MockCampaignDetail }) {
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-success px-4 py-3 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
          <FileEdit className="h-3 w-3" />
          Draft
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {campaign.type === "email" ? (
            <Mail className="h-3 w-3" />
          ) : (
            <MessageSquare className="h-3 w-3" />
          )}
          {campaign.type === "email" ? "Email" : "SMS"}
        </span>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Campaign Name</label>
          <input
            defaultValue={campaign.name}
            className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>

        {campaign.type === "email" && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Subject</label>
              <input
                defaultValue={campaign.subject ?? ""}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Body (HTML)</label>
              <textarea
                defaultValue={campaign.bodyHtml ?? ""}
                rows={8}
                className="w-full rounded-lg border border-input bg-background p-4 text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
              />
            </div>
          </>
        )}

        {campaign.type === "sms" && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">SMS Message</label>
            <textarea
              defaultValue={campaign.bodyText ?? ""}
              rows={4}
              className="w-full rounded-lg border border-input bg-background p-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
            />
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => showToast("Campaign saved")}
            className="flex h-9 items-center gap-2 rounded-lg border border-input px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Save Draft
          </button>
          <Link
            href={`/dashboard/campaigns/new`}
            className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Send className="h-4 w-4" />
            Continue to Send
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Sent Stats View ──

function SentView({ campaign }: { campaign: MockCampaignDetail }) {
  const [recipientSearch, setRecipientSearch] = useState("");

  const stats = campaign.stats;
  const sent = stats.sent || 1;
  const openRate = (stats.opened / sent) * 100;
  const clickRate = (stats.clicked / sent) * 100;
  const bounceRate = (stats.bounced / sent) * 100;
  const deliveryRate = (stats.delivered / sent) * 100;
  const unsubRate = (stats.unsubscribed / sent) * 100;

  const filteredRecipients = useMemo(() => {
    if (!recipientSearch.trim()) return mockRecipients;
    const q = recipientSearch.toLowerCase();
    return mockRecipients.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q),
    );
  }, [recipientSearch]);

  return (
    <div className="space-y-6">
      {/* Status badges */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
          <Send className="h-3 w-3" />
          Sent
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {campaign.type === "email" ? (
            <Mail className="h-3 w-3" />
          ) : (
            <MessageSquare className="h-3 w-3" />
          )}
          {campaign.type === "email" ? "Email" : "SMS"}
        </span>
        {campaign.sentAt && (
          <span className="text-xs text-muted-foreground">
            Sent on {formatDate(campaign.sentAt)}
          </span>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard
          label="Sent"
          value={stats.sent}
          icon={Send}
          className="text-info"
        />
        <StatCard
          label="Delivered"
          value={stats.delivered}
          icon={CheckCircle2}
          subValue={`${deliveryRate.toFixed(1)}%`}
          className="text-primary"
        />
        <StatCard
          label="Opened"
          value={stats.opened}
          icon={Eye}
          subValue={`${openRate.toFixed(1)}%`}
          className="text-success"
        />
        <StatCard
          label="Clicked"
          value={stats.clicked}
          icon={MousePointerClick}
          subValue={`${clickRate.toFixed(1)}%`}
          className="text-success"
        />
        <StatCard
          label="Bounced"
          value={stats.bounced}
          icon={AlertTriangle}
          subValue={`${bounceRate.toFixed(1)}%`}
          className="text-destructive"
        />
      </div>

      {/* Rate bars */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Performance Rates
        </h3>
        {campaign.type === "email" && (
          <RateBar label="Open Rate" rate={openRate} color="bg-success" />
        )}
        <RateBar label="Click Rate" rate={clickRate} color="bg-primary" />
        <RateBar label="Delivery Rate" rate={deliveryRate} color="bg-info" />
        <RateBar label="Bounce Rate" rate={bounceRate} color="bg-destructive" />
        <RateBar label="Unsubscribe Rate" rate={unsubRate} color="bg-warning" />
      </div>

      {/* Recipient list */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Recipients ({mockRecipients.length})
          </h3>
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={recipientSearch}
              onChange={(e) => setRecipientSearch(e.target.value)}
              placeholder="Search recipients..."
              className="h-8 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Name
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {campaign.type === "email" ? "Email" : "Phone"}
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Sent At
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Opened At
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Clicked At
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRecipients.map((recipient) => {
                const statusCfg = recipientStatusConfig[recipient.status];
                const StatusIcon = statusCfg.icon;

                return (
                  <tr
                    key={recipient.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {recipient.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {recipient.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-foreground">
                      {campaign.type === "email"
                        ? recipient.email
                        : recipient.phone}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 text-xs font-medium",
                          statusCfg.className,
                        )}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {recipient.sentAt
                        ? formatDate(recipient.sentAt)
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {recipient.openedAt
                        ? formatDate(recipient.openedAt)
                        : "—"}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {recipient.clickedAt
                        ? formatDate(recipient.clickedAt)
                        : "—"}
                    </td>
                  </tr>
                );
              })}
              {filteredRecipients.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-sm text-muted-foreground"
                  >
                    No recipients found matching &ldquo;{recipientSearch}&rdquo;
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.id as string;

  // Look up campaign from mock data — fallback to a default sent campaign
  const campaign = mockCampaigns[campaignId] ?? mockCampaigns["camp-1"];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/campaigns"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-input text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {campaign.name}
          </h1>
          {campaign.subject && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {campaign.subject}
            </p>
          )}
        </div>
      </div>

      {/* Render based on status */}
      {campaign.status === "draft" ? (
        <DraftView campaign={campaign} />
      ) : (
        <SentView campaign={campaign} />
      )}
    </div>
  );
}
