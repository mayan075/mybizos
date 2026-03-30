"use client";

import { useApiQuery, useApiMutation } from "./use-api";
import {
  type MockDeal,
  type MockPipelineColumn,
} from "@/lib/types";

// --------------------------------------------------------
// usePipelines — fetch pipeline column definitions
// --------------------------------------------------------

function usePipelines() {
  return useApiQuery<MockPipelineColumn[]>(
    "/orgs/:orgId/pipelines",
    [],
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
  currency?: string;
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

// --------------------------------------------------------
// Stage CRUD hooks
// --------------------------------------------------------

interface CreateStageInput {
  name: string;
  slug: string;
  color: string;
  position: number;
}

interface StageResponse {
  id: string;
  pipelineId: string;
  orgId: string;
  name: string;
  slug: string;
  position: number;
  color: string;
  createdAt: string;
  updatedAt: string;
}

function useCreateStage(pipelineId: string) {
  return useApiMutation<CreateStageInput, StageResponse>(
    `/orgs/:orgId/pipelines/${pipelineId}/stages`,
    "post",
  );
}

interface UpdateStageInput {
  name?: string;
  color?: string;
  position?: number;
}

function useUpdateStage(pipelineId: string, stageId: string) {
  return useApiMutation<UpdateStageInput, StageResponse>(
    `/orgs/:orgId/pipelines/${pipelineId}/stages/${stageId}`,
    "patch",
  );
}

function useDeleteStage(pipelineId: string, stageId: string) {
  return useApiMutation<Record<string, never>, { success: boolean }>(
    `/orgs/:orgId/pipelines/${pipelineId}/stages/${stageId}`,
    "delete",
  );
}

interface ReorderStagesInput {
  stages: Array<{ id: string; position: number }>;
}

function useReorderStages(pipelineId: string) {
  return useApiMutation<ReorderStagesInput, StageResponse[]>(
    `/orgs/:orgId/pipelines/${pipelineId}/stages/reorder`,
    "patch",
  );
}

export {
  usePipelines,
  useDeals,
  useCreateDeal,
  useMoveDeal,
  useCreateStage,
  useUpdateStage,
  useDeleteStage,
  useReorderStages,
};

export type { StageResponse, CreateStageInput, UpdateStageInput, ReorderStagesInput };
