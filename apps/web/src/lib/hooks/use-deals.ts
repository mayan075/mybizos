"use client";

import { useApiQuery, useApiMutation } from "./use-api";
import type { Deal, PipelineColumn } from "@/lib/types";
import { mockPipelineColumns } from "@/lib/mock-data";

// --------------------------------------------------------
// usePipelines — fetch pipeline column definitions
// --------------------------------------------------------

function usePipelines() {
  return useApiQuery<PipelineColumn[]>(
    "/orgs/:orgId/pipelines",
    mockPipelineColumns,
  );
}

// --------------------------------------------------------
// useDeals — fetch deals grouped by stage
// --------------------------------------------------------

function useDeals(pipelineId?: string) {
  const params: Record<string, string> = {};
  if (pipelineId) params.pipelineId = pipelineId;

  return useApiQuery<Record<string, Deal[]>>(
    "/orgs/:orgId/deals",
    {},
    Object.keys(params).length > 0 ? params : undefined,
  );
}

// --------------------------------------------------------
// useCreateDeal
// --------------------------------------------------------

interface CreateDealInput {
  title: string;
  contact: string;
  value: number;
  stageId: string;
}

function useCreateDeal() {
  return useApiMutation<CreateDealInput, Deal>(
    "/orgs/:orgId/deals",
    "post",
  );
}

// --------------------------------------------------------
// useMoveDeal — change a deal's stage
// --------------------------------------------------------

interface MoveDealInput {
  id: string;
  stageId: string;
}

function useMoveDeal() {
  return useApiMutation<MoveDealInput, Deal>(
    "/orgs/:orgId/deals",
    "patch",
  );
}

export { usePipelines, useDeals, useCreateDeal, useMoveDeal };
