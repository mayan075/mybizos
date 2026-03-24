"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  MoreHorizontal,
  FileText,
  CheckCircle2,
  Clock,
  FileEdit,
  Send,
  ArrowUpRight,
  ArrowRightLeft,
  XCircle,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";

// ── Types ──

interface MockEstimate {
  id: string;
  number: string;
  customerName: string;
  customerEmail: string;
  service: string;
  amount: number;
  status: "draft" | "sent" | "approved" | "expired";
  issueDate: string;
  validUntil: string;
}

// Real estimates will come from the API; start with empty array
const mockEstimates: MockEstimate[] = [];

// ── Helpers ──

type TabFilter = "all" | "draft" | "sent" | "approved" | "expired";

const statusConfig: Record<
  MockEstimate["status"],
  { label: string; icon: React.ElementType; className: string }
> = {
  draft: {
    label: "Draft",
    icon: FileEdit,
    className: "bg-muted text-muted-foreground",
  },
  sent: {
    label: "Sent",
    icon: Send,
    className: "bg-info/10 text-info",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    className: "bg-success/10 text-success",
  },
  expired: {
    label: "Expired",
    icon: XCircle,
    className: "bg-muted text-muted-foreground",
  },
};

function StatusBadge({ status }: { status: MockEstimate["status"] }) {
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

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Page ──

export default function EstimatesPage() {
  usePageTitle("Estimates");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const filtered = useMemo(() => {
    let result = mockEstimates;

    if (activeTab !== "all") {
      result = result.filter((est) => est.status === activeTab);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (est) =>
          est.customerName.toLowerCase().includes(q) ||
          est.number.toLowerCase().includes(q) ||
          est.service.toLowerCase().includes(q),
      );
    }

    return result;
  }, [search, activeTab]);

  const tabCounts = useMemo(() => {
    return {
      all: mockEstimates.length,
      draft: mockEstimates.filter((e) => e.status === "draft").length,
      sent: mockEstimates.filter((e) => e.status === "sent").length,
      approved: mockEstimates.filter((e) => e.status === "approved").length,
      expired: mockEstimates.filter((e) => e.status === "expired").length,
    };
  }, []);

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: tabCounts.all },
    { key: "draft", label: "Draft", count: tabCounts.draft },
    { key: "sent", label: "Sent", count: tabCounts.sent },
    { key: "approved", label: "Approved", count: tabCounts.approved },
    { key: "expired", label: "Expired", count: tabCounts.expired },
  ];

  // Summary stats
  const totalPending = mockEstimates
    .filter((e) => e.status === "sent")
    .reduce((sum, e) => sum + e.amount, 0);

  const totalApproved = mockEstimates
    .filter((e) => e.status === "approved")
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-success px-4 py-3 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estimates</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create estimates and convert approved ones to invoices
          </p>
        </div>
        <button
          onClick={() => showToast("Estimate builder coming soon")}
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg px-4",
            "bg-primary text-primary-foreground text-sm font-medium",
            "hover:bg-primary/90 transition-colors",
          )}
        >
          <Plus className="h-4 w-4" />
          Create Estimate
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
              <Clock className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Pending Approval</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totalPending)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Approved</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totalApproved)}</p>
            </div>
          </div>
        </div>
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
            placeholder="Search estimates..."
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
      </div>

      {/* Estimate Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Estimate
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Customer
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Service
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Amount
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Date
                </th>
                <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((estimate) => (
                <tr
                  key={estimate.id}
                  className="hover:bg-muted/20 transition-colors"
                >
                  <td className="px-5 py-3">
                    <p className="text-sm font-semibold text-primary">
                      {estimate.number}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {estimate.customerName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {estimate.customerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {estimate.customerEmail}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-sm text-foreground">{estimate.service}</p>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(estimate.amount)}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={estimate.status} />
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-sm text-foreground">
                      {formatDate(estimate.issueDate)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Valid until {formatDate(estimate.validUntil)}
                    </p>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {estimate.status === "approved" && (
                        <button
                          onClick={() => showToast(`Converting ${estimate.number} to invoice...`)}
                          className="flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-success bg-success/10 hover:bg-success/20 transition-colors"
                          title="Convert to Invoice"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                          Convert
                        </button>
                      )}
                      <button
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <FileText className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      No estimates found
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {search
                        ? `No results matching "${search}"`
                        : "No estimates yet. Create an estimate for a potential job."}
                    </p>
                    <button
                      onClick={() => showToast("Estimate builder coming soon")}
                      className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Create Estimate
                    </button>
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
