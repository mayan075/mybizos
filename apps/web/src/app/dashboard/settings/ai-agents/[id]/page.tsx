'use client';

import { use } from 'react';
import { useAiAgent } from '@/lib/hooks/use-ai-agents';
import { AgentEditor } from '@/components/ai-agents/agent-editor';

export default function AgentEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: agent, isLoading, refetch } = useAiAgent(id);

  const businessName = 'Northern Removals'; // TODO: get from org settings

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="h-96 animate-pulse rounded-xl bg-zinc-800/50" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-center">
        <p className="text-zinc-400">Agent not found</p>
      </div>
    );
  }

  return <AgentEditor agent={agent} businessName={businessName} onSaved={refetch} />;
}
