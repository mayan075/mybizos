'use client';

import { useRouter } from 'next/navigation';
import { Bot, Phone, MessageSquare, Star, Plus, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AiAgent, AiAgentType } from '@hararai/shared';
import { INDUSTRY_LABELS } from '@hararai/shared';

// ── Icon map for agent type ──────────────────────────────────────────────────

const AGENT_TYPE_ICONS: Record<AiAgentType, React.ElementType> = {
  phone: Phone,
  sms: MessageSquare,
  chat: MessageSquare,
  review: Star,
};

const AGENT_TYPE_LABELS: Record<AiAgentType, string> = {
  phone: 'Phone',
  sms: 'SMS',
  chat: 'Chat',
  review: 'Review',
};

// ── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-zinc-700/50 bg-zinc-800/60 p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="h-10 w-10 rounded-xl bg-zinc-700" />
        <div className="h-5 w-16 rounded-full bg-zinc-700" />
      </div>
      <div className="h-4 w-32 rounded bg-zinc-700 mb-2" />
      <div className="h-3 w-24 rounded bg-zinc-700/70" />
    </div>
  );
}

// ── Agent card ───────────────────────────────────────────────────────────────

interface AgentCardProps {
  agent: AiAgent;
  onClick: () => void;
}

function AgentCard({ agent, onClick }: AgentCardProps) {
  const TypeIcon = AGENT_TYPE_ICONS[agent.type] ?? Bot;
  const industryLabel = INDUSTRY_LABELS[agent.industry] ?? agent.industry;
  const typeLabel = AGENT_TYPE_LABELS[agent.type] ?? agent.type;

  return (
    <button
      onClick={onClick}
      className={cn(
        'group text-left w-full rounded-2xl border p-5 transition-all duration-200',
        'bg-zinc-800/60 border-zinc-700/50',
        'hover:bg-zinc-800 hover:border-zinc-600 hover:shadow-lg hover:shadow-black/20',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl',
          agent.isActive
            ? 'bg-blue-500/20 text-blue-400'
            : 'bg-zinc-700/60 text-zinc-400',
        )}>
          <TypeIcon className="h-5 w-5" />
        </div>
        {/* Active / inactive badge */}
        <span className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
          agent.isActive
            ? 'bg-emerald-500/10 text-emerald-400'
            : 'bg-zinc-700/60 text-zinc-400',
        )}>
          {agent.isActive
            ? <><CheckCircle2 className="h-3 w-3" />Active</>
            : <><XCircle className="h-3 w-3" />Inactive</>
          }
        </span>
      </div>

      {/* Name */}
      <p className="text-sm font-semibold text-zinc-100 group-hover:text-white transition-colors truncate mb-1">
        {agent.name}
      </p>

      {/* Meta row */}
      <div className="flex items-center gap-2 text-[11px] text-zinc-400">
        <span>{typeLabel}</span>
        <span className="text-zinc-600">·</span>
        <span>{industryLabel}</span>
      </div>
    </button>
  );
}

// ── Create new card ──────────────────────────────────────────────────────────

interface CreateCardProps {
  onClick: () => void;
}

function CreateCard({ onClick }: CreateCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group text-left w-full rounded-2xl border border-dashed p-5 transition-all duration-200',
        'bg-transparent border-zinc-700/50',
        'hover:bg-zinc-800/40 hover:border-zinc-600',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        'flex flex-col items-center justify-center min-h-[120px]',
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-700/50 group-hover:bg-blue-500/20 transition-colors mb-3">
        <Plus className="h-5 w-5 text-zinc-400 group-hover:text-blue-400 transition-colors" />
      </div>
      <p className="text-sm font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
        Create New Agent
      </p>
    </button>
  );
}

// ── AgentList ────────────────────────────────────────────────────────────────

interface AgentListProps {
  agents: AiAgent[];
  isLoading: boolean;
}

export function AgentList({ agents, isLoading }: AgentListProps) {
  const router = useRouter();

  const handleAgentClick = (agentId: string) => {
    router.push(`/dashboard/settings/ai-agents/${agentId}`);
  };

  const handleCreateClick = () => {
    router.push('/dashboard/settings/ai-agents/new');
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {isLoading
        ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        : agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={() => handleAgentClick(agent.id)}
            />
          ))
      }
      {/* Always show the Create card (unless loading) */}
      {!isLoading && (
        <CreateCard onClick={handleCreateClick} />
      )}
    </div>
  );
}
