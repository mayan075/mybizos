"use client";

import { useApiQuery, useApiMutation } from "./use-api";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Invoice {
  id: string;
  orgId: string;
  contactId: string | null;
  dealId: string | null;
  invoiceNumber: string;
  status: "draft" | "sent" | "viewed" | "paid" | "overdue" | "cancelled";
  issueDate: string;
  dueDate: string;
  lineItems: LineItem[];
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  currency: string;
  notes: string | null;
  paidAt: string | null;
  sentAt: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateInvoiceInput {
  contactId?: string;
  dealId?: string;
  dueDate: string;
  lineItems: LineItem[];
  taxRate?: number;
  currency?: string;
  notes?: string;
}

function useInvoices(options: { status?: string } = {}) {
  const params: Record<string, string> = {};
  if (options.status) params.status = options.status;

  return useApiQuery<Invoice[]>(
    "/orgs/:orgId/invoices",
    [],
    Object.keys(params).length > 0 ? params : undefined,
  );
}

function useInvoice(id: string) {
  return useApiQuery<Invoice | null>(`/orgs/:orgId/invoices/${id}`, null);
}

function useCreateInvoice() {
  return useApiMutation<CreateInvoiceInput, Invoice>("/orgs/:orgId/invoices", "post");
}

function useUpdateInvoice(id: string) {
  return useApiMutation<Partial<CreateInvoiceInput>, Invoice>(`/orgs/:orgId/invoices/${id}`, "patch");
}

function useSendInvoice(id: string) {
  return useApiMutation<void, Invoice>(`/orgs/:orgId/invoices/${id}/send`, "post");
}

function useMarkInvoicePaid(id: string) {
  return useApiMutation<void, Invoice>(`/orgs/:orgId/invoices/${id}/mark-paid`, "post");
}

function useDeleteInvoice(id: string) {
  return useApiMutation<void, { message: string }>(`/orgs/:orgId/invoices/${id}`, "delete");
}

export { useInvoices, useInvoice, useCreateInvoice, useUpdateInvoice, useSendInvoice, useMarkInvoicePaid, useDeleteInvoice };
export type { Invoice, LineItem, CreateInvoiceInput };
