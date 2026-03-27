"use client";

import { useApiQuery, useApiMutation } from "./use-api";

interface Campaign {
  id: string;
  orgId: string;
  name: string;
  type: "email" | "sms";
  status: "draft" | "scheduled" | "sending" | "sent" | "cancelled";
  subject: string | null;
  bodyHtml: string | null;
  bodyText: string | null;
  segmentFilter: Record<string, unknown> | null;
  scheduledAt: string | null;
  sentAt: string | null;
  stats: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateCampaignInput {
  name: string;
  type: "email" | "sms";
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
  segmentFilter?: Record<string, unknown>;
  scheduledAt?: string;
}

interface UpdateCampaignInput {
  name?: string;
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
  segmentFilter?: Record<string, unknown>;
  scheduledAt?: string;
}

function useCampaigns(options: { search?: string; status?: string; type?: string } = {}) {
  const params: Record<string, string> = {};
  if (options.search) params.search = options.search;
  if (options.status) params.status = options.status;
  if (options.type) params.type = options.type;

  return useApiQuery<Campaign[]>(
    "/orgs/:orgId/campaigns",
    [],
    Object.keys(params).length > 0 ? params : undefined,
  );
}

function useCampaign(id: string) {
  return useApiQuery<Campaign | null>(`/orgs/:orgId/campaigns/${id}`, null);
}

function useCreateCampaign() {
  return useApiMutation<CreateCampaignInput, Campaign>(
    "/orgs/:orgId/campaigns",
    "post",
  );
}

function useUpdateCampaign(id: string) {
  return useApiMutation<UpdateCampaignInput, Campaign>(
    `/orgs/:orgId/campaigns/${id}`,
    "patch",
  );
}

function useDeleteCampaign(id: string) {
  return useApiMutation<void, { message: string }>(
    `/orgs/:orgId/campaigns/${id}`,
    "delete",
  );
}

function useSendCampaign(id: string) {
  return useApiMutation<void, Campaign>(
    `/orgs/:orgId/campaigns/${id}/send`,
    "post",
  );
}

export {
  useCampaigns,
  useCampaign,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  useSendCampaign,
};

export type { Campaign, CreateCampaignInput, UpdateCampaignInput };
