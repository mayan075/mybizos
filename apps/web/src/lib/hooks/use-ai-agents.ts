'use client';

import { useApiQuery, useApiMutation } from './use-api';
import type { AiAgent } from '@hararai/shared';

const EMPTY_AGENTS: AiAgent[] = [];

export function useAiAgents() {
  return useApiQuery<AiAgent[]>(
    '/orgs/:orgId/ai-agents',
    EMPTY_AGENTS,
  );
}

export function useAiAgent(agentId: string) {
  return useApiQuery<AiAgent | null>(
    `/orgs/:orgId/ai-agents/${agentId}`,
    null,
    undefined,
    !!agentId,
  );
}

export function useCreateAgent() {
  return useApiMutation<Partial<AiAgent>, AiAgent>(
    '/orgs/:orgId/ai-agents',
    'post',
  );
}

export function useUpdateAgent(agentId: string) {
  return useApiMutation<Partial<AiAgent>, AiAgent>(
    `/orgs/:orgId/ai-agents/${agentId}`,
    'patch',
  );
}

export function useDeleteAgent(agentId: string) {
  return useApiMutation<void, { message: string }>(
    `/orgs/:orgId/ai-agents/${agentId}`,
    'delete',
  );
}

export function useAgentCallLogs(agentId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useApiQuery<any[]>(
    `/orgs/:orgId/ai-agents/${agentId}/call-logs`,
    [],
    undefined,
    !!agentId,
  );
}
