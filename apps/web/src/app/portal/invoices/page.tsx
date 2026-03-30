"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  CreditCard,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { tryFetch } from "@/lib/api-client";
import { getOrgId } from "@/lib/hooks/use-api";

type InvoiceStatus = "paid" | "unpaid" | "overdue" | "sent" | "draft";

interface Invoice {
  id: string;
  invoiceNumber: string;
  contactName: string;
  description: string;
  issueDate: string;
  dueDate: string;
  total: number;
  status: InvoiceStatus;
}

const statusConfig: Record<
  string,
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
  sent: {
    label: "Sent",
    className: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    icon: AlertCircle,
  },
  overdue: {
    label: "Overdue",
    className: "bg-red-500/10 text-red-700 dark:text-red-400",
    icon: AlertTriangle,
  },
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground",
    icon: FileText,
  },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const orgId = getOrgId();
      const data = await tryFetch<Invoice[]>(`/orgs/${orgId}/invoices`);
      setInvoices(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const totalOutstanding = invoices
    .filter((inv) => inv.status !== "paid" && inv.status !== "draft")
    .reduce((sum, inv) => sum + inv.total, 0);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
              {invoices.filter((i) => i.status !== "paid" && i.status !== "draft").length} unpaid{" "}
              {invoices.filter((i) => i.status !== "paid" && i.status !== "draft").length === 1
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
          const config = statusConfig[inv.status] ?? statusConfig["unpaid"]!;
          const StatusIcon = config.icon;
          const isOverdue = inv.status === "overdue" || (inv.status !== "paid" && new Date(inv.dueDate) < new Date());
          return (
            <div
              key={inv.id}
              className={cn(
                "rounded-xl border bg-card p-4",
                isOverdue ? "border-red-500/30" : "border-border"
              )}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">
                      {inv.invoiceNumber || inv.id}
                    </h3>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        config.className
                      )}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {isOverdue && inv.status !== "overdue" ? "Overdue" : config.label}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80">{inv.description}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground/70">
                    <span>Issued: {formatDate(inv.issueDate)}</span>
                    <span>Due: {formatDate(inv.dueDate)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <p className="text-lg font-bold text-foreground">
                    ${inv.total.toFixed(2)}
                  </p>
                  {inv.status === "paid" ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground/80 transition-colors hover:bg-muted/50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Receipt
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors",
                        isOverdue
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
