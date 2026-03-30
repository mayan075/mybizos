'use client';

import { Bot } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAiAgents } from '@/lib/hooks/use-ai-agents';
import { AgentList } from '@/components/ai-agents/agent-list';

export default function AiAgentsPage() {
  const router = useRouter();
  const { data: agents, isLoading } = useAiAgents();

  return (
    <div className="min-h-screen bg-zinc-900 p-6 md:p-8">
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20">
              <Bot className="h-5 w-5 text-blue-400" />
            </div>
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight">AI Agents</h1>
          </div>
          <p className="text-sm text-zinc-400 ml-12">
            Manage your AI voice and messaging agents. Each agent handles calls or messages for your business.
          </p>
        </div>

        <button
          onClick={() => router.push('/dashboard/settings/ai-agents/new')}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Bot className="h-4 w-4" />
          New Agent
        </button>
      </div>

      {/* Agent grid */}
      <AgentList agents={agents} isLoading={isLoading} />
    </div>
  );
}
