'use client';

import { use, useMemo } from 'react';
import { useAiAgent } from '@/lib/hooks/use-ai-agents';
import { AgentEditor } from '@/components/ai-agents/agent-editor';
import { getUser } from '@/lib/auth';
import { getOnboardingData } from '@/lib/onboarding';

export default function AgentEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: agent, isLoading, refetch } = useAiAgent(id);

  const businessName = useMemo(() => {
    const user = typeof window !== 'undefined' ? getUser() : null;
    const onboarding = typeof window !== 'undefined' ? getOnboardingData() : null;
    return user?.orgName || onboarding?.businessName || 'My Business';
  }, []);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="h-96 animate-pulse rounded-xl bg-zinc-800/50" />
      </div>
    );
  }

  if (!agent || !agent.id) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-center">
        <p className="text-zinc-400">Agent not found</p>
      </div>
    );
  }

  // Ensure settings is always a valid object (DB may return null/string in edge cases)
  const safeAgent = {
    ...agent,
    settings: (typeof agent.settings === 'object' && agent.settings !== null ? agent.settings : {}) as Record<string, unknown>,
  };

  return <AgentEditor agent={safeAgent} businessName={businessName} onSaved={refetch} />;
}
