"use client";

import { useApiQuery, useApiMutation } from "./use-api";
import {
  mockPipelineColumns,
  type MockDeal,
  type MockPipelineColumn,
} from "@/lib/mock-data";

// --------------------------------------------------------
// usePipelines — fetch pipeline column definitions
// --------------------------------------------------------

function usePipelines() {
  return useApiQuery<MockPipelineColumn[]>(
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

  return useApiQuery<Record<string, MockDeal[]>>(
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
  return useApiMutation<CreateDealInput, MockDeal>(
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
  return useApiMutation<MoveDealInput, MockDeal>(
    "/orgs/:orgId/deals",
    "patch",
  );
}

export { usePipelines, useDeals, useCreateDeal, useMoveDeal };
