"use client";

import { useApiQuery, useApiMutation } from "./use-api";

interface SequenceStep {
  type: "send_email" | "send_sms" | "wait" | "add_tag" | "remove_tag" | "ai_decision";
  config: Record<string, unknown>;
}

interface Sequence {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  triggerType: "manual" | "tag_added" | "deal_stage_changed" | "form_submitted" | "appointment_completed" | "contact_created";
  triggerConfig: Record<string, unknown>;
  steps: SequenceStep[];
  isActive: boolean;
  enrolledCount: number;
  completedCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CreateSequenceInput {
  name: string;
  description?: string;
  triggerType: string;
  triggerConfig?: Record<string, unknown>;
  steps: SequenceStep[];
}

interface UpdateSequenceInput {
  name?: string;
  description?: string;
  triggerType?: string;
  triggerConfig?: Record<string, unknown>;
  steps?: SequenceStep[];
}

function useSequences() {
  return useApiQuery<Sequence[]>("/orgs/:orgId/sequences", []);
}

function useSequence(id: string) {
  return useApiQuery<Sequence | null>(`/orgs/:orgId/sequences/${id}`, null);
}

function useCreateSequence() {
  return useApiMutation<CreateSequenceInput, Sequence>(
    "/orgs/:orgId/sequences",
    "post",
  );
}

function useUpdateSequence(id: string) {
  return useApiMutation<UpdateSequenceInput, Sequence>(
    `/orgs/:orgId/sequences/${id}`,
    "patch",
  );
}

function useDeleteSequence(id: string) {
  return useApiMutation<void, { message: string }>(
    `/orgs/:orgId/sequences/${id}`,
    "delete",
  );
}

function useActivateSequence(id: string) {
  return useApiMutation<void, Sequence>(
    `/orgs/:orgId/sequences/${id}/activate`,
    "post",
  );
}

function useDeactivateSequence(id: string) {
  return useApiMutation<void, Sequence>(
    `/orgs/:orgId/sequences/${id}/deactivate`,
    "post",
  );
}

export {
  useSequences,
  useSequence,
  useCreateSequence,
  useUpdateSequence,
  useDeleteSequence,
  useActivateSequence,
  useDeactivateSequence,
};

export type { Sequence, SequenceStep, CreateSequenceInput, UpdateSequenceInput };
