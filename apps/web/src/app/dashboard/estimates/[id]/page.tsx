"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  FileEdit,
  FileText,
  Clock,
  Plus,
  Trash2,
  Save,
  ArrowRightLeft,
  Trash,
  Eye,
  ThumbsDown,
  XCircle,
  Loader2,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { trackPageVisit } from "@/lib/recently-viewed";
import {
  useEstimate,
  useUpdateEstimate,
  useSendEstimate,
  useConvertToInvoice,
  useDeleteEstimate,
} from "@/lib/hooks/use-estimates";
import type { Estimate } from "@/lib/hooks/use-estimates";

// ── Types ──

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

interface EstimateData {
  id: string;
  number: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  service: string;
  status: Estimate["status"];
  lineItems: LineItem[];
  taxRate: number;
  issueDate: string;
  validUntil: string;
  acceptedAt: string | null;
  sentAt: string | null;
  convertedToInvoiceId: string | null;
  notes: string;
}

/** Map an API Estimate to the local EstimateData shape used by the UI */
function mapApiEstimate(est: Estimate): EstimateData {
  return {
    id: est.id,
    number: est.estimateNumber,
    customerName: est.contactName ?? "Unknown Customer",
    customerEmail: est.contactEmail ?? "",
    customerPhone: "",
    customerAddress: "",
    service: est.lineItems?.[0]?.description ?? "Service",
    status: est.status,
    lineItems: (est.lineItems ?? []).map((li, idx) => ({
      id: `li-${idx}`,
      description: li.description,
      quantity: li.quantity,
      rate: li.unitPrice,
    })),
    taxRate: parseFloat(est.taxRate) || 0,
    issueDate: est.issueDate ? est.issueDate.split("T")[0] ?? "" : "",
    validUntil: est.validUntil ? est.validUntil.split("T")[0] ?? "" : "",
    acceptedAt: est.acceptedAt ? est.acceptedAt.split("T")[0] ?? null : null,
    sentAt: est.sentAt ? est.sentAt.split("T")[0] ?? null : null,
    convertedToInvoiceId: est.convertedToInvoiceId,
    notes: est.notes ?? "",
  };
}

// ── Helpers ──

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function generateId(): string {
  return `li-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

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
    icon: Eye,
    className: "bg-info/10 text-info",
  },
  accepted: {
    label: "Accepted",
    icon: CheckCircle2,
    className: "bg-success/10 text-success",
  },
  declined: {
    label: "Declined",
    icon: ThumbsDown,
    className: "bg-destructive/10 text-destructive",
  },
  expired: {
    label: "Expired",
    icon: XCircle,
    className: "bg-muted text-muted-foreground",
  },
};

// ── Page ──

export default function EstimateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const estimateId = params.id as string;
  const toast = useToast();

  // Fetch estimate from API
  const { data: apiEstimate, isLoading, refetch } = useEstimate(estimateId);

  const estimateData = useMemo(() => {
    if (!apiEstimate) return null;
    return mapApiEstimate(apiEstimate);
  }, [apiEstimate]);

  // Track page visit for recently viewed
  useEffect(() => {
    if (estimateData) {
      trackPageVisit({
        path: `/dashboard/estimates/${estimateId}`,
        label: estimateData.number,
        type: "Estimate",
      });
    }
  }, [estimateId, estimateData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/estimates"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-input text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Loading...</h1>
        </div>
        <div className="rounded-xl border border-border bg-card p-12 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!estimateData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/estimates"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-input text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Estimate Not Found</h1>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">
            Estimate not found
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            The estimate you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link
            href="/dashboard/estimates"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Back to Estimates
          </Link>
        </div>
      </div>
    );
  }

  if (estimateData.status === "draft") {
    return (
      <div className="space-y-4">
        <Breadcrumbs currentLabel={estimateData.number} />
        <DraftEstimateView
          estimate={estimateData}
          estimateId={estimateId}
          router={router}
          onRefetch={refetch}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs currentLabel={estimateData.number} />
      <EstimateView
        estimate={estimateData}
        estimateId={estimateId}
        router={router}
        onRefetch={refetch}
      />
    </div>
  );
}

// ── Draft View (Editable) ──

function DraftEstimateView({
  estimate,
  estimateId,
  router,
  onRefetch,
}: {
  estimate: EstimateData;
  estimateId: string;
  router: ReturnType<typeof useRouter>;
  onRefetch: () => void;
}) {
  const toast = useToast();
  const [lineItems, setLineItems] = useState<LineItem[]>(estimate.lineItems);
  const [taxRate, setTaxRate] = useState(estimate.taxRate);
  const [notes, setNotes] = useState(estimate.notes);
  const [validUntil, setValidUntil] = useState(estimate.validUntil);

  const { mutate: updateEstimate, isLoading: isUpdating } = useUpdateEstimate(estimateId);
  const { mutate: sendEstimate, isLoading: isSending } = useSendEstimate(estimateId);
  const { mutate: deleteEstimate, isLoading: isDeleting } = useDeleteEstimate(estimateId);

  const subtotal = useMemo(
    () => lineItems.reduce((sum, li) => sum + li.quantity * li.rate, 0),
    [lineItems],
  );
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  function updateLineItem(id: string, updates: Partial<LineItem>) {
    setLineItems((prev) =>
      prev.map((li) => (li.id === id ? { ...li, ...updates } : li)),
    );
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      { id: generateId(), description: "", quantity: 1, rate: 0 },
    ]);
  }

  function removeLineItem(id: string) {
    setLineItems((prev) => prev.filter((li) => li.id !== id));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/estimates"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-input text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{estimate.number}</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                <FileEdit className="h-3 w-3" />
                Draft
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {estimate.customerName} &middot; {estimate.service}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              const result = await deleteEstimate();
              if (result) {
                toast.success("Estimate deleted");
                setTimeout(() => router.push("/dashboard/estimates"), 1500);
              } else {
                toast.error("Failed to delete estimate");
              }
            }}
            disabled={isUpdating || isSending || isDeleting}
            className="flex h-9 items-center gap-2 rounded-lg border border-destructive/30 px-4 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
            Delete
          </button>
          <button
            onClick={async () => {
              const payload = {
                validUntil,
                lineItems: lineItems
                  .filter((li) => li.description.trim() || li.rate > 0)
                  .map((li) => ({
                    description: li.description,
                    quantity: li.quantity,
                    unitPrice: li.rate,
                    amount: li.quantity * li.rate,
                  })),
                taxRate,
                notes: notes || undefined,
              };
              const result = await updateEstimate(payload);
              if (result) {
                toast.success("Estimate saved");
                onRefetch();
              } else {
                toast.error("Failed to save estimate");
              }
            }}
            disabled={isUpdating || isSending || isDeleting}
            className="flex h-9 items-center gap-2 rounded-lg border border-input px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Draft
          </button>
          <button
            onClick={async () => {
              const payload = {
                validUntil,
                lineItems: lineItems
                  .filter((li) => li.description.trim() || li.rate > 0)
                  .map((li) => ({
                    description: li.description,
                    quantity: li.quantity,
                    unitPrice: li.rate,
                    amount: li.quantity * li.rate,
                  })),
                taxRate,
                notes: notes || undefined,
              };
              await updateEstimate(payload);
              const result = await sendEstimate();
              if (result) {
                toast.success(`Estimate sent to ${estimate.customerEmail}`);
                setTimeout(() => router.push("/dashboard/estimates"), 1500);
              } else {
                toast.error("Failed to send estimate");
              }
            }}
            disabled={isUpdating || isSending || isDeleting}
            className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send Estimate
          </button>
        </div>
      </div>

      {/* Customer Info */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Estimate For</h2>
        <div className="rounded-lg bg-muted/30 p-3 space-y-1">
          <p className="text-sm font-medium text-foreground">{estimate.customerName}</p>
          <p className="text-xs text-muted-foreground">{estimate.customerEmail}</p>
          <p className="text-xs text-muted-foreground">{estimate.customerPhone}</p>
          <p className="text-xs text-muted-foreground">{estimate.customerAddress}</p>
        </div>
      </div>

      {/* Line Items */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Line Items</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-[1fr_80px_100px_100px_40px] gap-3 px-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Qty</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Rate</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Amount</p>
            <div />
          </div>

          {lineItems.map((item) => (
            <div key={item.id} className="grid grid-cols-[1fr_80px_100px_100px_40px] gap-3 items-center">
              <input
                value={item.description}
                onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateLineItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground text-center focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={item.rate || ""}
                  onChange={(e) => updateLineItem(item.id, { rate: parseFloat(e.target.value) || 0 })}
                  className="h-10 w-full rounded-lg border border-input bg-background pl-7 pr-3 text-sm text-foreground text-right focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                />
              </div>
              <p className="text-sm font-medium text-foreground text-right">
                {formatCurrency(item.quantity * item.rate)}
              </p>
              <button
                onClick={() => removeLineItem(item.id)}
                disabled={lineItems.length <= 1}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                  lineItems.length > 1
                    ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    : "text-muted-foreground/30 cursor-not-allowed",
                )}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          <button
            onClick={addLineItem}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:bg-muted/30 hover:text-foreground hover:border-primary/30 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Line Item
          </button>
        </div>

        {/* Totals */}
        <div className="mt-6 border-t border-border pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Subtotal</p>
            <p className="text-sm font-medium text-foreground">{formatCurrency(subtotal)}</p>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Tax</p>
              <div className="relative w-20">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={taxRate || ""}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="h-8 w-full rounded-md border border-input bg-background px-2 pr-6 text-sm text-foreground text-right focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <p className="text-sm font-medium text-foreground">{formatCurrency(taxAmount)}</p>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3">
            <p className="text-base font-bold text-foreground">Total</p>
            <p className="text-xl font-bold text-foreground">{formatCurrency(total)}</p>
          </div>
        </div>
      </div>

      {/* Valid Until & Notes */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Valid Until</label>
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="h-10 w-full max-w-xs rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
          />
        </div>
      </div>
    </div>
  );
}

// ── Sent/Accepted/Viewed/Declined/Expired View ──

function EstimateView({
  estimate,
  estimateId,
  router,
  onRefetch,
}: {
  estimate: EstimateData;
  estimateId: string;
  router: ReturnType<typeof useRouter>;
  onRefetch: () => void;
}) {
  const toast = useToast();
  const { mutate: sendEstimate, isLoading: isSending } = useSendEstimate(estimateId);
  const { mutate: convertToInvoice, isLoading: isConverting } = useConvertToInvoice(estimateId);
  const { mutate: deleteEstimate, isLoading: isDeleting } = useDeleteEstimate(estimateId);

  const subtotal = estimate.lineItems.reduce(
    (sum, li) => sum + li.quantity * li.rate,
    0,
  );
  const taxAmount = subtotal * (estimate.taxRate / 100);
  const total = subtotal + taxAmount;

  const cfg = statusConfig[estimate.status] ?? statusConfig.draft;
  const StatusIcon = cfg.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/estimates"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-input text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{estimate.number}</h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  cfg.className,
                )}
              >
                <StatusIcon className="h-3 w-3" />
                {cfg.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {estimate.customerName} &middot; {estimate.service}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {(estimate.status === "sent" || estimate.status === "viewed") && (
            <button
              onClick={async () => {
                const result = await sendEstimate();
                if (result) {
                  toast.success(`Estimate resent to ${estimate.customerEmail}`);
                  onRefetch();
                } else {
                  toast.error("Failed to resend estimate");
                }
              }}
              disabled={isSending}
              className="flex h-9 items-center gap-2 rounded-lg border border-input px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Resend
            </button>
          )}
          {estimate.status === "accepted" && !estimate.convertedToInvoiceId && (
            <button
              onClick={async () => {
                const result = await convertToInvoice();
                if (result) {
                  toast.success("Estimate converted to invoice");
                  onRefetch();
                } else {
                  toast.error("Failed to convert estimate");
                }
              }}
              disabled={isConverting}
              className="flex h-9 items-center gap-2 rounded-lg bg-success px-4 text-sm font-medium text-white hover:bg-success/90 transition-colors disabled:opacity-50"
            >
              {isConverting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
              Convert to Invoice
            </button>
          )}
          {estimate.convertedToInvoiceId && (
            <Link
              href={`/dashboard/invoices/${estimate.convertedToInvoiceId}`}
              className="flex h-9 items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-4 text-sm font-medium text-success hover:bg-success/10 transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              View Invoice
            </Link>
          )}
          <button
            onClick={async () => {
              const result = await deleteEstimate();
              if (result) {
                toast.success("Estimate deleted");
                setTimeout(() => router.push("/dashboard/estimates"), 1500);
              } else {
                toast.error("Failed to delete estimate");
              }
            }}
            disabled={isDeleting}
            className="flex h-9 items-center gap-2 rounded-lg border border-destructive/30 px-4 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
            Delete
          </button>
        </div>
      </div>

      {/* Estimate Preview Card */}
      <div className="rounded-xl border border-border bg-white p-8 shadow-sm relative overflow-hidden">
        {/* ACCEPTED Stamp */}
        {estimate.status === "accepted" && (
          <div className="absolute top-12 right-8 rotate-[-15deg] pointer-events-none">
            <div className="border-4 border-green-500 rounded-lg px-6 py-2 opacity-20">
              <p className="text-4xl font-black text-green-500 tracking-widest">ACCEPTED</p>
            </div>
          </div>
        )}

        {/* DECLINED Stamp */}
        {estimate.status === "declined" && (
          <div className="absolute top-12 right-8 rotate-[-15deg] pointer-events-none">
            <div className="border-4 border-red-500 rounded-lg px-6 py-2 opacity-20">
              <p className="text-4xl font-black text-red-500 tracking-widest">DECLINED</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Jim&apos;s Plumbing &amp; HVAC</h3>
                <p className="text-xs text-gray-500">Licensed &amp; Insured</p>
              </div>
            </div>
            <div className="mt-2 space-y-0.5">
              <p className="text-xs text-gray-500">123 Main Street, Denver, CO 80201</p>
              <p className="text-xs text-gray-500">(555) 123-4567 &middot; mayan@northernremovals.com.au</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold text-gray-900">ESTIMATE</h2>
            <p className="text-sm font-medium text-gray-600 mt-1">{estimate.number}</p>
            <div className="mt-3 space-y-1">
              <div className="flex justify-end gap-4 text-xs">
                <span className="text-gray-400">Issue Date:</span>
                <span className="text-gray-700 font-medium">{formatDate(estimate.issueDate)}</span>
              </div>
              <div className="flex justify-end gap-4 text-xs">
                <span className="text-gray-400">Valid Until:</span>
                <span className={cn(
                  "font-medium",
                  estimate.status === "expired" ? "text-red-600" : "text-gray-700",
                )}>
                  {formatDate(estimate.validUntil)}
                </span>
              </div>
              {estimate.acceptedAt && (
                <div className="flex justify-end gap-4 text-xs">
                  <span className="text-gray-400">Accepted:</span>
                  <span className="text-green-600 font-medium">{formatDate(estimate.acceptedAt)}</span>
                </div>
              )}
              {estimate.sentAt && (
                <div className="flex justify-end gap-4 text-xs">
                  <span className="text-gray-400">Sent:</span>
                  <span className="text-gray-700 font-medium">{formatDate(estimate.sentAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-200 mb-6" />

        {/* Estimate For */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Estimate For</p>
          <p className="text-sm font-medium text-gray-900">{estimate.customerName}</p>
          <p className="text-xs text-gray-500">{estimate.customerEmail}</p>
          <p className="text-xs text-gray-500">{estimate.customerPhone}</p>
          <p className="text-xs text-gray-500">{estimate.customerAddress}</p>
        </div>

        {/* Line Items Table */}
        <table className="w-full mb-6">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Description</th>
              <th className="py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-400 w-20">Qty</th>
              <th className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 w-28">Rate</th>
              <th className="py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 w-28">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {estimate.lineItems.map((item) => (
              <tr key={item.id}>
                <td className="py-3 text-sm text-gray-900">{item.description}</td>
                <td className="py-3 text-sm text-gray-600 text-center">{item.quantity}</td>
                <td className="py-3 text-sm text-gray-600 text-right">{formatCurrency(item.rate)}</td>
                <td className="py-3 text-sm font-medium text-gray-900 text-right">
                  {formatCurrency(item.quantity * item.rate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900">{formatCurrency(subtotal)}</span>
            </div>
            {taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax ({estimate.taxRate}%)</span>
                <span className="text-gray-900">{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-bold text-gray-900">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {estimate.notes && (
          <div className="mt-8 border-t border-gray-200 pt-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Notes</p>
            <p className="text-xs text-gray-600 whitespace-pre-wrap">{estimate.notes}</p>
          </div>
        )}
      </div>

      {/* Timeline / Activity */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Activity
        </h2>
        <div className="space-y-3">
          {estimate.acceptedAt && (
            <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Estimate accepted</p>
                  <p className="text-xs text-muted-foreground">Customer accepted the estimate</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(estimate.acceptedAt)}</p>
            </div>
          )}
          {estimate.sentAt && (
            <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-info/10">
                  <Send className="h-4 w-4 text-info" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Estimate sent</p>
                  <p className="text-xs text-muted-foreground">Sent to {estimate.customerEmail}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{formatDate(estimate.sentAt)}</p>
            </div>
          )}
          {estimate.convertedToInvoiceId && (
            <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10">
                  <ArrowRightLeft className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Converted to invoice</p>
                  <p className="text-xs text-muted-foreground">
                    <Link href={`/dashboard/invoices/${estimate.convertedToInvoiceId}`} className="text-primary hover:underline">
                      View invoice
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Estimate created</p>
                <p className="text-xs text-muted-foreground">For {estimate.customerName}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{formatDate(estimate.issueDate)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
