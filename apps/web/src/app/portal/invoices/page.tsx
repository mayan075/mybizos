"use client";

import {
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

type InvoiceStatus = "paid" | "unpaid" | "overdue";

interface Invoice {
  id: string;
  service: string;
  date: string;
  dueDate: string;
  amount: number;
  status: InvoiceStatus;
}

const invoices: Invoice[] = [
  {
    id: "INV-1051",
    service: "AC Maintenance & Tune-Up",
    date: "Mar 18, 2026",
    dueDate: "Apr 1, 2026",
    amount: 175.0,
    status: "unpaid",
  },
  {
    id: "INV-1045",
    service: "Emergency Pipe Repair — Kitchen",
    date: "Feb 28, 2026",
    dueDate: "Mar 14, 2026",
    amount: 425.0,
    status: "overdue",
  },
  {
    id: "INV-1042",
    service: "Furnace Repair — Ignitor Replacement",
    date: "Mar 10, 2026",
    dueDate: "Mar 24, 2026",
    amount: 285.0,
    status: "paid",
  },
  {
    id: "INV-1038",
    service: "Kitchen Faucet Installation",
    date: "Feb 22, 2026",
    dueDate: "Mar 8, 2026",
    amount: 340.0,
    status: "paid",
  },
];

const statusConfig: Record<
  InvoiceStatus,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  paid: {
    label: "Paid",
    className: "bg-green-500/10 text-green-700 dark:text-green-400",
    icon: CheckCircle2,
  },
  unpaid: {
    label: "Unpaid",
    className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    icon: AlertCircle,
  },
  overdue: {
    label: "Overdue",
    className: "bg-red-500/10 text-red-700 dark:text-red-400",
    icon: AlertTriangle,
  },
};

export default function InvoicesPage() {
  const totalOutstanding = invoices
    .filter((inv) => inv.status !== "paid")
    .reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and pay your service invoices
        </p>
      </div>

      {/* Outstanding balance card */}
      {totalOutstanding > 0 && (
        <div className="flex items-center gap-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
            <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              Outstanding Balance
            </p>
            <p className="text-xs text-muted-foreground">
              You have{" "}
              {invoices.filter((i) => i.status !== "paid").length} unpaid{" "}
              {invoices.filter((i) => i.status !== "paid").length === 1
                ? "invoice"
                : "invoices"}
            </p>
          </div>
          <p className="text-xl font-bold text-amber-700">
            ${totalOutstanding.toFixed(2)}
          </p>
        </div>
      )}

      {/* Invoice list */}
      <div className="space-y-3">
        {invoices.map((inv) => {
          const config = statusConfig[inv.status];
          const StatusIcon = config.icon;
          return (
            <div
              key={inv.id}
              className={cn(
                "rounded-xl border bg-card p-4",
                inv.status === "overdue"
                  ? "border-red-500/30"
                  : "border-border"
              )}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">
                      {inv.id}
                    </h3>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        config.className
                      )}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80">{inv.service}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground/70">
                    <span>Issued: {inv.date}</span>
                    <span>Due: {inv.dueDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <p className="text-lg font-bold text-foreground">
                    ${inv.amount.toFixed(2)}
                  </p>
                  {inv.status === "paid" ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted/50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Receipt
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors",
                        inv.status === "overdue"
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-blue-600 hover:bg-blue-700"
                      )}
                    >
                      Pay Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {invoices.length === 0 && (
        <div className="py-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            No invoices yet
          </p>
        </div>
      )}
    </div>
  );
}
