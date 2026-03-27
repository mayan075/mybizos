"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  MoreHorizontal,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileEdit,
  Send,
  Receipt,
  ArrowUpRight,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { usePageTitle } from "@/lib/hooks/use-page-title";
import { useInvoices, type Invoice } from "@/lib/hooks/use-invoices";

// ── Helpers ──

type InvoiceStatus = Invoice["status"];
type TabFilter = "all" | "draft" | "sent" | "paid" | "overdue";

const statusConfig: Record<
  string,
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
  viewed: {
    label: "Viewed",
    icon: Send,
    className: "bg-info/10 text-info",
  },
  paid: {
    label: "Paid",
    icon: CheckCircle2,
    className: "bg-success/10 text-success",
  },
  overdue: {
    label: "Overdue",
    icon: AlertTriangle,
    className: "bg-destructive/10 text-destructive",
  },
  cancelled: {
    label: "Cancelled",
    icon: AlertTriangle,
    className: "bg-muted text-muted-foreground",
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? statusConfig.draft;
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
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Map API status to tab filter buckets */
function toTabBucket(status: InvoiceStatus): TabFilter | null {
  if (status === "draft") return "draft";
  if (status === "sent" || status === "viewed") return "sent";
  if (status === "paid") return "paid";
  if (status === "overdue") return "overdue";
  return null;
}

// ── Page ──

export default function InvoicesPage() {
  usePageTitle("Invoices");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  const { data: invoicesData, isLoading } = useInvoices();
  const invoices = Array.isArray(invoicesData) ? invoicesData : [];

  const filtered = useMemo(() => {
    let result = invoices;

    if (activeTab !== "all") {
      result = result.filter((inv) => toTabBucket(inv.status) === activeTab);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (inv) =>
          (inv.contactName ?? "").toLowerCase().includes(q) ||
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.lineItems.some((li) => li.description.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [search, activeTab, invoices]);

  const tabCounts = useMemo(() => {
    return {
      all: invoices.length,
      draft: invoices.filter((i) => toTabBucket(i.status) === "draft").length,
      sent: invoices.filter((i) => toTabBucket(i.status) === "sent").length,
      paid: invoices.filter((i) => toTabBucket(i.status) === "paid").length,
      overdue: invoices.filter((i) => toTabBucket(i.status) === "overdue").length,
    };
  }, [invoices]);

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: tabCounts.all },
    { key: "draft", label: "Draft", count: tabCounts.draft },
    { key: "sent", label: "Sent", count: tabCounts.sent },
    { key: "paid", label: "Paid", count: tabCounts.paid },
    { key: "overdue", label: "Overdue", count: tabCounts.overdue },
  ];

  // Summary stats
  const totalOutstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "viewed" || i.status === "overdue")
    .reduce((sum, i) => sum + parseFloat(i.total), 0);

  const totalPaidThisMonth = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + parseFloat(i.total), 0);

  const totalOverdue = invoices
    .filter((i) => i.status === "overdue")
    .reduce((sum, i) => sum + parseFloat(i.total), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage invoices and track payments
          </p>
        </div>
        <Link
          href="/dashboard/invoices/new"
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg px-4",
            "bg-primary text-primary-foreground text-sm font-medium",
            "hover:bg-primary/90 transition-colors",
          )}
        >
          <Plus className="h-4 w-4" />
          Create Invoice
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Outstanding</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totalOutstanding)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Paid This Month</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totalPaidThisMonth)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Overdue</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totalOverdue)}</p>
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
            placeholder="Search invoices..."
            className="h-9 w-full rounded-lg border border-input bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
      </div>

      {/* Invoice Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Invoice
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
              {filtered.map((invoice) => {
                const customerName = invoice.contactName ?? "Unknown";
                const customerEmail = invoice.contactEmail ?? "";
                const serviceDesc = invoice.lineItems[0]?.description ?? "—";
                const amount = parseFloat(invoice.total);

                return (
                  <tr
                    key={invoice.id}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/invoices/${invoice.id}`}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {customerName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {customerName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {customerEmail}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-foreground">{serviceDesc}</p>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(amount)}
                      </p>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={invoice.status} />
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-sm text-foreground">
                        {formatDate(invoice.issueDate)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Due {formatDate(invoice.dueDate)}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/dashboard/invoices/${invoice.id}`}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          title="View invoice"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <Receipt className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      No invoices found
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      {search
                        ? `No results matching "${search}"`
                        : "No invoices yet. Create your first invoice to get paid."}
                    </p>
                    <Link
                      href="/dashboard/invoices/new"
                      className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Create Invoice
                    </Link>
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
