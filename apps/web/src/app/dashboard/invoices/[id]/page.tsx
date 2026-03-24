"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  AlertTriangle,
  FileEdit,
  Receipt,
  MessageSquare,
  CreditCard,
  Clock,
  Plus,
  Trash2,
  Save,
  Bell,
  Smartphone,
  DollarSign,
  ChevronDown,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { trackPageVisit } from "@/lib/recently-viewed";
import { useEffect } from "react";

// ── Types ──

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  method: string;
}

interface InvoiceData {
  id: string;
  number: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  service: string;
  status: "draft" | "sent" | "paid" | "overdue";
  lineItems: LineItem[];
  taxRate: number;
  issueDate: string;
  dueDate: string;
  paidDate: string | null;
  notes: string;
  terms: string;
  isRecurring: boolean;
  recurringInterval: string | null;
  payments: PaymentRecord[];
}

// Real invoice data will come from the API
const mockInvoiceDetails: Record<string, InvoiceData> = {};

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

// ── Page ──

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;
  const [toast, setToast] = useState<string | null>(null);

  const invoiceData = mockInvoiceDetails[invoiceId];

  // Track page visit for recently viewed
  useEffect(() => {
    if (invoiceData) {
      trackPageVisit({
        path: `/dashboard/invoices/${invoiceId}`,
        label: invoiceData.number,
        type: "Invoice",
      });
    }
  }, [invoiceId, invoiceData]);

  if (!invoiceData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/invoices"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-input text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Invoice Not Found</h1>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Receipt className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">
            Invoice not found
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            The invoice you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link
            href="/dashboard/invoices"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Back to Invoices
          </Link>
        </div>
      </div>
    );
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  if (invoiceData.status === "draft") {
    return (
      <div className="space-y-4">
        <Breadcrumbs currentLabel={invoiceData.number} />
        <DraftInvoiceView
          invoice={invoiceData}
          toast={toast}
          showToast={showToast}
          router={router}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs currentLabel={invoiceData.number} />
      <InvoiceView
        invoice={invoiceData}
        toast={toast}
        showToast={showToast}
      />
    </div>
  );
}

// ── Draft View (Editable) ──

function DraftInvoiceView({
  invoice,
  toast,
  showToast,
  router,
}: {
  invoice: InvoiceData;
  toast: string | null;
  showToast: (msg: string) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [lineItems, setLineItems] = useState<LineItem[]>(invoice.lineItems);
  const [taxRate, setTaxRate] = useState(invoice.taxRate);
  const [notes, setNotes] = useState(invoice.notes);
  const [terms, setTerms] = useState(invoice.terms);
  const [dueDate, setDueDate] = useState(invoice.dueDate);

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
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-success px-4 py-3 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/invoices"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-input text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{invoice.number}</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                <FileEdit className="h-3 w-3" />
                Draft
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {invoice.customerName} &middot; {invoice.service}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              showToast("Invoice saved");
            }}
            className="flex h-9 items-center gap-2 rounded-lg border border-input px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </button>
          <button
            onClick={() => {
              showToast(`Invoice sent to ${invoice.customerEmail}`);
              setTimeout(() => router.push("/dashboard/invoices"), 1500);
            }}
            className="flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Send className="h-4 w-4" />
            Send Invoice
          </button>
        </div>
      </div>

      {/* Customer Info */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground mb-3">Bill To</h2>
        <div className="rounded-lg bg-muted/30 p-3 space-y-1">
          <p className="text-sm font-medium text-foreground">{invoice.customerName}</p>
          <p className="text-xs text-muted-foreground">{invoice.customerEmail}</p>
          <p className="text-xs text-muted-foreground">{invoice.customerPhone}</p>
          <p className="text-xs text-muted-foreground">{invoice.customerAddress}</p>
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

      {/* Due Date & Notes */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
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
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Terms &amp; Conditions</label>
          <textarea
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
          />
        </div>
      </div>
    </div>
  );
}

// ── Sent/Paid/Overdue View ──

function InvoiceView({
  invoice,
  toast,
  showToast,
}: {
  invoice: InvoiceData;
  toast: string | null;
  showToast: (msg: string) => void;
}) {
  const subtotal = invoice.lineItems.reduce(
    (sum, li) => sum + li.quantity * li.rate,
    0,
  );
  const taxAmount = subtotal * (invoice.taxRate / 100);
  const total = subtotal + taxAmount;
  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const balanceDue = total - totalPaid;

  const statusConfig: Record<
    string,
    { label: string; icon: React.ElementType; className: string; stampClass: string }
  > = {
    sent: {
      label: "Sent",
      icon: Send,
      className: "bg-info/10 text-info",
      stampClass: "",
    },
    paid: {
      label: "Paid",
      icon: CheckCircle2,
      className: "bg-success/10 text-success",
      stampClass: "border-success text-success",
    },
    overdue: {
      label: "Overdue",
      icon: AlertTriangle,
      className: "bg-destructive/10 text-destructive",
      stampClass: "border-destructive text-destructive",
    },
  };

  const cfg = statusConfig[invoice.status] ?? statusConfig.sent;
  const StatusIcon = cfg.icon;

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg bg-success px-4 py-3 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/invoices"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-input text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{invoice.number}</h1>
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
              {invoice.customerName} &middot; {invoice.service}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {invoice.status === "overdue" && (
            <button
              onClick={() => showToast(`Reminder sent to ${invoice.customerEmail}`)}
              className="flex h-9 items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 text-sm font-medium text-warning hover:bg-warning/10 transition-colors"
            >
              <Bell className="h-4 w-4" />
              Send Reminder
            </button>
          )}
          {(invoice.status === "sent" || invoice.status === "overdue") && (
            <>
              <button
                onClick={() => showToast(`Payment link texted to ${invoice.customerPhone}`)}
                className="flex h-9 items-center gap-2 rounded-lg border border-input px-4 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Smartphone className="h-4 w-4" />
                Text Payment Link
              </button>
              <button
                onClick={() => showToast("Invoice marked as paid")}
                className="flex h-9 items-center gap-2 rounded-lg bg-success px-4 text-sm font-medium text-white hover:bg-success/90 transition-colors"
              >
                <DollarSign className="h-4 w-4" />
                Mark as Paid
              </button>
            </>
          )}
        </div>
      </div>

      {/* Invoice Preview Card */}
      <div className="rounded-xl border border-border bg-white p-8 shadow-sm relative overflow-hidden">
        {/* PAID Stamp */}
        {invoice.status === "paid" && (
          <div className="absolute top-12 right-8 rotate-[-15deg] pointer-events-none">
            <div className="border-4 border-green-500 rounded-lg px-6 py-2 opacity-20">
              <p className="text-4xl font-black text-green-500 tracking-widest">PAID</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                <Receipt className="h-5 w-5 text-white" />
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
            <h2 className="text-3xl font-bold text-gray-900">INVOICE</h2>
            <p className="text-sm font-medium text-gray-600 mt-1">{invoice.number}</p>
            <div className="mt-3 space-y-1">
              <div className="flex justify-end gap-4 text-xs">
                <span className="text-gray-400">Issue Date:</span>
                <span className="text-gray-700 font-medium">{formatDate(invoice.issueDate)}</span>
              </div>
              <div className="flex justify-end gap-4 text-xs">
                <span className="text-gray-400">Due Date:</span>
                <span className={cn(
                  "font-medium",
                  invoice.status === "overdue" ? "text-red-600" : "text-gray-700",
                )}>
                  {formatDate(invoice.dueDate)}
                </span>
              </div>
              {invoice.paidDate && (
                <div className="flex justify-end gap-4 text-xs">
                  <span className="text-gray-400">Paid Date:</span>
                  <span className="text-green-600 font-medium">{formatDate(invoice.paidDate)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-200 mb-6" />

        {/* Bill To */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Bill To</p>
          <p className="text-sm font-medium text-gray-900">{invoice.customerName}</p>
          <p className="text-xs text-gray-500">{invoice.customerEmail}</p>
          <p className="text-xs text-gray-500">{invoice.customerPhone}</p>
          <p className="text-xs text-gray-500">{invoice.customerAddress}</p>
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
            {invoice.lineItems.map((item) => (
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
                <span className="text-gray-500">Tax ({invoice.taxRate}%)</span>
                <span className="text-gray-900">{formatCurrency(taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-bold text-gray-900">{formatCurrency(total)}</span>
            </div>
            {invoice.payments.length > 0 && balanceDue > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount Paid</span>
                  <span className="text-green-600">-{formatCurrency(totalPaid)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                  <span className="font-bold text-gray-900">Balance Due</span>
                  <span className="font-bold text-red-600">{formatCurrency(balanceDue)}</span>
                </div>
              </>
            )}
            {invoice.status === "paid" && (
              <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
                <span className="font-bold text-green-600">Balance Due</span>
                <span className="font-bold text-green-600">{formatCurrency(0)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notes & Terms */}
        {(invoice.notes || invoice.terms) && (
          <div className="mt-8 border-t border-gray-200 pt-6 space-y-4">
            {invoice.notes && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Notes</p>
                <p className="text-xs text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Terms &amp; Conditions</p>
                <p className="text-xs text-gray-500 whitespace-pre-wrap">{invoice.terms}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment History */}
      {invoice.payments.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment History
          </h2>
          <div className="space-y-3">
            {invoice.payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between rounded-lg bg-muted/30 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/10">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">{payment.method}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(payment.date)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
