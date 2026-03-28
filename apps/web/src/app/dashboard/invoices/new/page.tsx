"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  Save,
  Send,
  Receipt,
  ChevronDown,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useContacts } from "@/lib/hooks/use-contacts";
import { useCreateInvoice } from "@/lib/hooks/use-invoices";
import { getUser } from "@/lib/auth";
import { getOnboardingData } from "@/lib/onboarding";
import type { CreateInvoiceInput } from "@/lib/hooks/use-invoices";

// ── Types ──

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

interface InvoiceDraft {
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  lineItems: LineItem[];
  taxRate: number;
  dueDate: string;
  notes: string;
  terms: string;
}

// ── Zod Validation ──

const invoiceLineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  rate: z.number().min(0.01, "Rate must be greater than 0"),
});

const invoiceFormSchema = z.object({
  customerName: z.string().min(1, "Customer must be selected"),
  lineItems: z
    .array(invoiceLineItemSchema)
    .min(1, "At least one line item is required")
    .refine(
      (items) => items.some((li) => li.description.trim().length > 0 && li.rate > 0),
      "At least one line item must have a description and rate > 0",
    ),
  dueDate: z.string().min(1, "Due date is required").refine(
    (val) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(val + "T00:00:00");
      return due >= today;
    },
    "Due date must be today or in the future",
  ),
});

interface InvoiceFormErrors {
  customer?: string;
  lineItems?: string;
  dueDate?: string;
}

function validateInvoiceForm(draft: InvoiceDraft): InvoiceFormErrors {
  const result = invoiceFormSchema.safeParse({
    customerName: draft.customerName.trim(),
    lineItems: draft.lineItems,
    dueDate: draft.dueDate,
  });
  if (result.success) return {};
  const errors: InvoiceFormErrors = {};
  for (const issue of result.error.issues) {
    const path = issue.path[0];
    if (path === "customerName" && !errors.customer) {
      errors.customer = issue.message;
    } else if (path === "lineItems" && !errors.lineItems) {
      errors.lineItems = issue.message;
    } else if (path === "dueDate" && !errors.dueDate) {
      errors.dueDate = issue.message;
    }
  }
  return errors;
}

// ── Helpers ──

function generateId(): string {
  return `li-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

// ── Page ──

export default function NewInvoicePage() {
  const router = useRouter();
  const toast = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [formErrors, setFormErrors] = useState<InvoiceFormErrors>({});

  // API hooks
  const { data: contacts, isLoading: contactsLoading } = useContacts({ search: customerSearch });
  const { mutate: createInvoice, isLoading: isSaving } = useCreateInvoice();

  // Business info for preview
  const user = useMemo(() => getUser(), []);
  const onboarding = useMemo(() => getOnboardingData(), []);
  const businessName = user?.orgName || onboarding?.businessName || "My Business";
  const businessEmail = user?.email || "";
  const businessPhone = onboarding?.phoneSetup?.existingNumber || "";

  const [draft, setDraft] = useState<InvoiceDraft>({
    customerId: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    lineItems: [
      { id: generateId(), description: "", quantity: 1, rate: 0 },
    ],
    taxRate: 0,
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] as string,
    notes: "",
    terms: "Payment is due within 15 days of invoice date. Late payments may be subject to a 1.5% monthly finance charge.",
  });

  function selectCustomer(contact: { id: string; name: string; email: string; phone: string }) {
    setDraft((prev) => ({
      ...prev,
      customerId: contact.id,
      customerName: contact.name,
      customerEmail: contact.email,
      customerPhone: contact.phone,
      customerAddress: "",
    }));
    setShowCustomerDropdown(false);
    setCustomerSearch("");
  }

  function updateLineItem(id: string, updates: Partial<LineItem>) {
    setDraft((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((li) =>
        li.id === id ? { ...li, ...updates } : li,
      ),
    }));
  }

  function addLineItem() {
    setDraft((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        { id: generateId(), description: "", quantity: 1, rate: 0 },
      ],
    }));
  }

  function removeLineItem(id: string) {
    setDraft((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((li) => li.id !== id),
    }));
  }

  const subtotal = useMemo(() => {
    return draft.lineItems.reduce((sum, li) => sum + li.quantity * li.rate, 0);
  }, [draft.lineItems]);

  const taxAmount = useMemo(() => {
    return subtotal * (draft.taxRate / 100);
  }, [subtotal, draft.taxRate]);

  const total = useMemo(() => {
    return subtotal + taxAmount;
  }, [subtotal, taxAmount]);

  const filteredContacts = useMemo(() => {
    // The useContacts hook already handles server-side search filtering
    return contacts;
  }, [contacts]);

  const canSave = draft.customerName.trim().length > 0 && draft.lineItems.some((li) => li.description.trim().length > 0 && li.rate > 0);

  const buildPayload = useCallback((): CreateInvoiceInput => {
    return {
      contactId: draft.customerId || undefined,
      dueDate: draft.dueDate,
      lineItems: draft.lineItems
        .filter((li) => li.description.trim() || li.rate > 0)
        .map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.rate,
          amount: li.quantity * li.rate,
        })),
      taxRate: draft.taxRate,
      notes: draft.notes || undefined,
    };
  }, [draft]);

  const handleSaveDraft = useCallback(async () => {
    const errors = validateInvoiceForm(draft);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error("Please fix the errors below");
      return;
    }
    const payload = buildPayload();
    const result = await createInvoice(payload);
    if (result) {
      toast.success("Invoice saved as draft");
      setTimeout(() => router.push("/dashboard/invoices"), 1500);
    } else {
      toast.error("Failed to save invoice. Please try again.");
    }
  }, [buildPayload, createInvoice, router, draft]);

  const handleSend = useCallback(async () => {
    const errors = validateInvoiceForm(draft);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error("Please fix the errors below");
      return;
    }
    const payload = buildPayload();
    const result = await createInvoice(payload);
    if (result) {
      // After creating, send it via the send endpoint
      const { apiClient, tryFetch } = await import("@/lib/api-client");
      const { buildPath } = await import("@/lib/hooks/use-api");
      const sendPath = buildPath(`/orgs/:orgId/invoices/${result.id}/send`);
      await tryFetch(() => apiClient.post(sendPath, {}));
      toast.success(`Invoice sent to ${draft.customerEmail}`);
      setTimeout(() => router.push("/dashboard/invoices"), 1500);
    } else {
      toast.error("Failed to create invoice. Please try again.");
    }
  }, [buildPayload, createInvoice, router, draft]);

  const invoiceNumber = "New";
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/invoices"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-input text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              New Invoice
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {invoiceNumber} &middot; {today}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={cn(
              "flex h-9 items-center gap-2 rounded-lg border border-input px-4 text-sm font-medium transition-colors",
              showPreview
                ? "bg-primary/10 text-primary border-primary/30"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={!canSave || isSaving}
            className={cn(
              "flex h-9 items-center gap-2 rounded-lg border border-input px-4 text-sm font-medium transition-colors",
              canSave && !isSaving
                ? "text-foreground hover:bg-muted"
                : "text-muted-foreground cursor-not-allowed",
            )}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Draft
          </button>
          <button
            onClick={handleSend}
            disabled={!canSave || isSaving}
            className={cn(
              "flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors",
              canSave && !isSaving
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send Invoice
          </button>
        </div>
      </div>

      <div className={cn("grid gap-6", showPreview ? "grid-cols-2" : "grid-cols-1")}>
        {/* Invoice Form */}
        <div className="space-y-6">
          {/* Customer Selection */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Bill To</h2>
            <div className="relative">
              <button
                onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                className={cn(
                  "flex h-10 w-full items-center justify-between rounded-lg border px-3 text-sm transition-colors",
                  draft.customerName
                    ? "border-input bg-background text-foreground"
                    : "border-input bg-background text-muted-foreground",
                )}
              >
                {draft.customerName || "Select a customer..."}
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>

              {showCustomerDropdown && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-lg border border-border bg-card shadow-lg">
                  <div className="p-2 border-b border-border">
                    <input
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search contacts..."
                      className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto py-1">
                    {contactsLoading && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Loading contacts...</span>
                      </div>
                    )}
                    {!contactsLoading && filteredContacts.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => selectCustomer(contact)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                          {(contact.name || "?").split(" ").map((n: string) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{contact.name}</p>
                          <p className="text-xs text-muted-foreground">{contact.email}</p>
                        </div>
                      </button>
                    ))}
                    {!contactsLoading && filteredContacts.length === 0 && (
                      <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                        No contacts found
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {formErrors.customer && (
              <p className="flex items-center gap-1 text-xs text-destructive mt-2">
                <AlertCircle className="h-3 w-3" />
                {formErrors.customer}
              </p>
            )}

            {draft.customerName && (
              <div className="mt-3 rounded-lg bg-muted/30 p-3 space-y-1">
                <p className="text-sm font-medium text-foreground">{draft.customerName}</p>
                <p className="text-xs text-muted-foreground">{draft.customerEmail}</p>
                <p className="text-xs text-muted-foreground">{draft.customerPhone}</p>
                <p className="text-xs text-muted-foreground">{draft.customerAddress}</p>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Line Items</h2>
              {formErrors.lineItems && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {formErrors.lineItems}
                </p>
              )}
            </div>
            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-[1fr_80px_100px_100px_40px] gap-3 px-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Qty</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Rate</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Amount</p>
                <div />
              </div>

              {/* Items */}
              {draft.lineItems.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_80px_100px_100px_40px] gap-3 items-center">
                  <input
                    value={item.description}
                    onChange={(e) => updateLineItem(item.id, { description: e.target.value })}
                    placeholder="Service description..."
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
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
                      placeholder="0.00"
                      className="h-10 w-full rounded-lg border border-input bg-background pl-7 pr-3 text-sm text-foreground text-right placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                    />
                  </div>
                  <p className="text-sm font-medium text-foreground text-right">
                    {formatCurrency(item.quantity * item.rate)}
                  </p>
                  <button
                    onClick={() => removeLineItem(item.id)}
                    disabled={draft.lineItems.length <= 1}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                      draft.lineItems.length > 1
                        ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        : "text-muted-foreground/30 cursor-not-allowed",
                    )}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {/* Add line item */}
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
                      value={draft.taxRate || ""}
                      onChange={(e) => setDraft((prev) => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                      className="h-8 w-full rounded-md border border-input bg-background px-2 pr-6 text-sm text-foreground text-right placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Due Date</label>
                <input
                  type="date"
                  value={draft.dueDate}
                  onChange={(e) => {
                    setDraft((prev) => ({ ...prev, dueDate: e.target.value }));
                    if (formErrors.dueDate) setFormErrors((prev) => ({ ...prev, dueDate: undefined }));
                  }}
                  className={cn(
                    "h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 transition-colors",
                    formErrors.dueDate
                      ? "border-destructive focus:ring-destructive/30"
                      : "border-input focus:ring-ring",
                  )}
                />
                {formErrors.dueDate && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    {formErrors.dueDate}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Invoice Number</label>
                <input
                  value={invoiceNumber}
                  readOnly
                  className="h-10 w-full rounded-lg border border-input bg-muted/50 px-3 text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Notes</label>
              <textarea
                value={draft.notes}
                onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes for the customer..."
                rows={3}
                className="w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Terms &amp; Conditions</label>
              <textarea
                value={draft.terms}
                onChange={(e) => setDraft((prev) => ({ ...prev, terms: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-input bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors resize-none"
              />
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="rounded-xl border border-border bg-white dark:bg-white dark:border-gray-200 p-8 shadow-sm sticky top-6 self-start">
            <InvoicePreview
              draft={draft}
              invoiceNumber={invoiceNumber}
              subtotal={subtotal}
              taxAmount={taxAmount}
              total={total}
              businessName={businessName}
              businessEmail={businessEmail}
              businessPhone={businessPhone}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Invoice Preview Component ──

function InvoicePreview({
  draft,
  invoiceNumber,
  subtotal,
  taxAmount,
  total,
  businessName,
  businessEmail,
  businessPhone,
}: {
  draft: InvoiceDraft;
  invoiceNumber: string;
  subtotal: number;
  taxAmount: number;
  total: number;
  businessName: string;
  businessEmail: string;
  businessPhone: string;
}) {
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const dueDate = draft.dueDate
    ? new Date(draft.dueDate + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "Not set";

  return (
    <div className="space-y-6 text-gray-900">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Receipt className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">{businessName}</h3>
          </div>
          {businessPhone && <p className="text-xs text-gray-500">{businessPhone}</p>}
          {businessEmail && <p className="text-xs text-gray-500">{businessEmail}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
          <p className="text-sm text-gray-500 mt-1">{invoiceNumber}</p>
          <p className="text-xs text-gray-500 mt-0.5">Date: {today}</p>
          <p className="text-xs text-gray-500">Due: {dueDate}</p>
        </div>
      </div>

      <div className="h-px bg-gray-200" />

      {/* Bill To */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Bill To</p>
        {draft.customerName ? (
          <div>
            <p className="text-sm font-medium text-gray-900">{draft.customerName}</p>
            <p className="text-xs text-gray-500">{draft.customerEmail}</p>
            <p className="text-xs text-gray-500">{draft.customerAddress}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No customer selected</p>
        )}
      </div>

      {/* Line Items */}
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Description</th>
            <th className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">Qty</th>
            <th className="py-2 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Rate</th>
            <th className="py-2 text-right text-xs font-semibold uppercase tracking-wider text-gray-400">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {draft.lineItems
            .filter((li) => li.description.trim() || li.rate > 0)
            .map((item) => (
              <tr key={item.id}>
                <td className="py-2 text-gray-900">{item.description || "---"}</td>
                <td className="py-2 text-center text-gray-600">{item.quantity}</td>
                <td className="py-2 text-right text-gray-600">
                  {formatCurrency(item.rate)}
                </td>
                <td className="py-2 text-right font-medium text-gray-900">
                  {formatCurrency(item.quantity * item.rate)}
                </td>
              </tr>
            ))}
          {draft.lineItems.every((li) => !li.description.trim() && li.rate === 0) && (
            <tr>
              <td colSpan={4} className="py-4 text-center text-gray-400 italic text-xs">
                No line items added
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      {/* Totals */}
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Subtotal</span>
          <span className="text-gray-900">
            {formatCurrency(subtotal)}
          </span>
        </div>
        {taxAmount > 0 && (
          <div className="flex justify-between">
            <span className="text-gray-500">Tax ({draft.taxRate}%)</span>
            <span className="text-gray-900">
              {formatCurrency(taxAmount)}
            </span>
          </div>
        )}
        <div className="flex justify-between border-t border-gray-200 pt-2">
          <span className="text-base font-bold text-gray-900">Total</span>
          <span className="text-base font-bold text-gray-900">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      {/* Notes */}
      {draft.notes && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Notes</p>
          <p className="text-xs text-gray-600 whitespace-pre-wrap">{draft.notes}</p>
        </div>
      )}

      {/* Terms */}
      {draft.terms && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Terms &amp; Conditions</p>
          <p className="text-xs text-gray-500 whitespace-pre-wrap">{draft.terms}</p>
        </div>
      )}
    </div>
  );
}
