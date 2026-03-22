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
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──

interface MockInvoice {
  id: string;
  number: string;
  customerName: string;
  customerEmail: string;
  service: string;
  amount: number;
  isRecurring: boolean;
  recurringInterval: string | null;
  status: "draft" | "sent" | "paid" | "overdue";
  issueDate: string;
  dueDate: string;
  paidDate: string | null;
  sentDaysAgo: number | null;
  overdueDays: number | null;
}

// ── Mock Data ──

const mockInvoices: MockInvoice[] = [
  {
    id: "inv-001",
    number: "INV-001",
    customerName: "Sarah Johnson",
    customerEmail: "sarah.johnson@email.com",
    service: "Drain Cleaning",
    amount: 250,
    isRecurring: false,
    recurringInterval: null,
    status: "paid",
    issueDate: "2026-03-05",
    dueDate: "2026-03-20",
    paidDate: "2026-03-12",
    sentDaysAgo: null,
    overdueDays: null,
  },
  {
    id: "inv-002",
    number: "INV-002",
    customerName: "Mike Thompson",
    customerEmail: "mike.thompson@email.com",
    service: "Water Heater Install",
    amount: 3200,
    isRecurring: false,
    recurringInterval: null,
    status: "sent",
    issueDate: "2026-03-17",
    dueDate: "2026-04-01",
    paidDate: null,
    sentDaysAgo: 5,
    overdueDays: null,
  },
  {
    id: "inv-003",
    number: "INV-003",
    customerName: "David Wilson",
    customerEmail: "david.wilson@email.com",
    service: "AC Tune-Up",
    amount: 149,
    isRecurring: false,
    recurringInterval: null,
    status: "overdue",
    issueDate: "2026-02-28",
    dueDate: "2026-03-10",
    paidDate: null,
    sentDaysAgo: null,
    overdueDays: 12,
  },
  {
    id: "inv-004",
    number: "INV-004",
    customerName: "Jennifer Brown",
    customerEmail: "jennifer.brown@email.com",
    service: "Bathroom Remodel",
    amount: 8500,
    isRecurring: false,
    recurringInterval: null,
    status: "draft",
    issueDate: "2026-03-22",
    dueDate: "2026-04-06",
    paidDate: null,
    sentDaysAgo: null,
    overdueDays: null,
  },
  {
    id: "inv-005",
    number: "INV-005",
    customerName: "Robert Lee",
    customerEmail: "robert.lee@email.com",
    service: "Emergency Plumbing",
    amount: 375,
    isRecurring: false,
    recurringInterval: null,
    status: "paid",
    issueDate: "2026-03-08",
    dueDate: "2026-03-22",
    paidDate: "2026-03-10",
    sentDaysAgo: null,
    overdueDays: null,
  },
  {
    id: "inv-006",
    number: "INV-006",
    customerName: "Lisa Martinez",
    customerEmail: "lisa.martinez@email.com",
    service: "Furnace Repair",
    amount: 890,
    isRecurring: false,
    recurringInterval: null,
    status: "sent",
    issueDate: "2026-03-20",
    dueDate: "2026-04-04",
    paidDate: null,
    sentDaysAgo: 2,
    overdueDays: null,
  },
  {
    id: "inv-007",
    number: "INV-007",
    customerName: "Tom Anderson",
    customerEmail: "tom.anderson@email.com",
    service: "Kitchen Sink Install",
    amount: 450,
    isRecurring: false,
    recurringInterval: null,
    status: "paid",
    issueDate: "2026-03-01",
    dueDate: "2026-03-15",
    paidDate: "2026-03-14",
    sentDaysAgo: null,
    overdueDays: null,
  },
  {
    id: "inv-008",
    number: "INV-008",
    customerName: "Amy Chen",
    customerEmail: "amy.chen@email.com",
    service: "HVAC Maintenance Plan",
    amount: 39,
    isRecurring: true,
    recurringInterval: "monthly",
    status: "paid",
    issueDate: "2026-03-01",
    dueDate: "2026-03-15",
    paidDate: "2026-03-02",
    sentDaysAgo: null,
    overdueDays: null,
  },
];

// ── Helpers ──

type TabFilter = "all" | "draft" | "sent" | "paid" | "overdue";

const statusConfig: Record<
  MockInvoice["status"],
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
};

function StatusBadge({ status }: { status: MockInvoice["status"] }) {
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Page ──

export default function InvoicesPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  const filtered = useMemo(() => {
    let result = mockInvoices;

    if (activeTab !== "all") {
      result = result.filter((inv) => inv.status === activeTab);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.customerName.toLowerCase().includes(q) ||
          inv.number.toLowerCase().includes(q) ||
          inv.service.toLowerCase().includes(q),
      );
    }

    return result;
  }, [search, activeTab]);

  const tabCounts = useMemo(() => {
    return {
      all: mockInvoices.length,
      draft: mockInvoices.filter((i) => i.status === "draft").length,
      sent: mockInvoices.filter((i) => i.status === "sent").length,
      paid: mockInvoices.filter((i) => i.status === "paid").length,
      overdue: mockInvoices.filter((i) => i.status === "overdue").length,
    };
  }, []);

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: "all", label: "All", count: tabCounts.all },
    { key: "draft", label: "Draft", count: tabCounts.draft },
    { key: "sent", label: "Sent", count: tabCounts.sent },
    { key: "paid", label: "Paid", count: tabCounts.paid },
    { key: "overdue", label: "Overdue", count: tabCounts.overdue },
  ];

  // Summary stats
  const totalOutstanding = mockInvoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + i.amount, 0);

  const totalPaidThisMonth = mockInvoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.amount, 0);

  const totalOverdue = mockInvoices
    .filter((i) => i.status === "overdue")
    .reduce((sum, i) => sum + i.amount, 0);

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
              {filtered.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="hover:bg-muted/20 transition-colors"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/dashboard/invoices/${invoice.id}`}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      {invoice.number}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {invoice.customerName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {invoice.customerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {invoice.customerEmail}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm text-foreground">{invoice.service}</p>
                      {invoice.isRecurring && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-info/10 px-1.5 py-0.5 text-[10px] font-medium text-info">
                          <RefreshCw className="h-2.5 w-2.5" />
                          {invoice.recurringInterval}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <p className="text-sm font-semibold text-foreground">
                      {formatCurrency(invoice.amount)}
                      {invoice.isRecurring && (
                        <span className="text-xs font-normal text-muted-foreground">/mo</span>
                      )}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={invoice.status} />
                    {invoice.sentDaysAgo !== null && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {invoice.sentDaysAgo} days ago
                      </p>
                    )}
                    {invoice.overdueDays !== null && (
                      <p className="text-[10px] text-destructive mt-0.5">
                        {invoice.overdueDays} days overdue
                      </p>
                    )}
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
              ))}
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
                        : "Create your first invoice to start getting paid"}
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
