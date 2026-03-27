"use client";

import { useApiQuery, useApiMutation } from "./use-api";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface Estimate {
  id: string;
  orgId: string;
  contactId: string | null;
  dealId: string | null;
  estimateNumber: string;
  status: "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired";
  issueDate: string;
  validUntil: string;
  lineItems: LineItem[];
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  total: string;
  currency: string;
  notes: string | null;
  acceptedAt: string | null;
  sentAt: string | null;
  convertedToInvoiceId: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateEstimateInput {
  contactId?: string;
  dealId?: string;
  validUntil: string;
  lineItems: LineItem[];
  taxRate?: number;
  currency?: string;
  notes?: string;
}

function useEstimates(options: { status?: string } = {}) {
  const params: Record<string, string> = {};
  if (options.status) params.status = options.status;

  return useApiQuery<Estimate[]>(
    "/orgs/:orgId/estimates",
    [],
    Object.keys(params).length > 0 ? params : undefined,
  );
}

function useEstimate(id: string) {
  return useApiQuery<Estimate | null>(`/orgs/:orgId/estimates/${id}`, null);
}

function useCreateEstimate() {
  return useApiMutation<CreateEstimateInput, Estimate>("/orgs/:orgId/estimates", "post");
}

function useUpdateEstimate(id: string) {
  return useApiMutation<Partial<CreateEstimateInput>, Estimate>(`/orgs/:orgId/estimates/${id}`, "patch");
}

function useSendEstimate(id: string) {
  return useApiMutation<void, Estimate>(`/orgs/:orgId/estimates/${id}/send`, "post");
}

function useConvertToInvoice(id: string) {
  return useApiMutation<void, unknown>(`/orgs/:orgId/estimates/${id}/convert-to-invoice`, "post");
}

function useDeleteEstimate(id: string) {
  return useApiMutation<void, { message: string }>(`/orgs/:orgId/estimates/${id}`, "delete");
}

export { useEstimates, useEstimate, useCreateEstimate, useUpdateEstimate, useSendEstimate, useConvertToInvoice, useDeleteEstimate };
export type { Estimate, LineItem, CreateEstimateInput };
