'use client';

import { useState } from 'react';
import { Phone, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgentCallLogs } from '@/lib/hooks/use-ai-agents';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CallLog {
  id: string;
  createdAt: string;
  durationSeconds: number;
  outcome: 'booked' | 'qualified' | 'escalated' | 'spam' | 'voicemail';
  transcript?: string;
  summary?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const OUTCOME_STYLES: Record<CallLog['outcome'], string> = {
  booked:    'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30',
  qualified: 'bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/30',
  escalated: 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30',
  spam:      'bg-red-500/15 text-red-400 ring-1 ring-red-500/30',
  voicemail: 'bg-zinc-500/15 text-zinc-400 ring-1 ring-zinc-500/30',
};

const OUTCOME_LABELS: Record<CallLog['outcome'], string> = {
  booked:    'Booked',
  qualified: 'Qualified',
  escalated: 'Escalated',
  spam:      'Spam',
  voicemail: 'Voicemail',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes === 0) return `${remaining}s`;
  return remaining > 0 ? `${minutes}m ${remaining}s` : `${minutes}m`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center gap-4 rounded-lg border border-zinc-700/30 bg-zinc-800/30 p-4">
      <div className="h-8 w-8 rounded-full bg-zinc-700/50" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-32 rounded bg-zinc-700/50" />
        <div className="h-2.5 w-20 rounded bg-zinc-700/40" />
      </div>
      <div className="h-5 w-20 rounded-full bg-zinc-700/50" />
      <div className="h-4 w-4 rounded bg-zinc-700/40" />
    </div>
  );
}

interface CallLogRowProps {
  log: CallLog;
  expanded: boolean;
  onToggle: () => void;
}

function CallLogRow({ log, expanded, onToggle }: CallLogRowProps) {
  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-700/30 bg-zinc-800/30">
      {/* Row header */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
          'hover:bg-zinc-700/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        )}
      >
        {/* Phone icon */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-700/50">
          <Phone className="h-3.5 w-3.5 text-zinc-400" />
        </div>

        {/* Date + time */}
        <div className="flex flex-1 flex-col gap-0.5 min-w-0">
          <span className="text-sm font-medium text-zinc-200">
            {formatDate(log.createdAt)}
          </span>
          <span className="text-xs text-zinc-500">{formatTime(log.createdAt)}</span>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-1 text-xs text-zinc-400 shrink-0">
          <Clock className="h-3 w-3" />
          <span className="tabular-nums">{formatDuration(log.durationSeconds)}</span>
        </div>

        {/* Outcome badge */}
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium',
            OUTCOME_STYLES[log.outcome],
          )}
        >
          {OUTCOME_LABELS[log.outcome]}
        </span>

        {/* Expand toggle */}
        <ChevronIcon className="h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-150" />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-zinc-700/30 px-4 py-4 space-y-3">
          {log.summary && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Summary
              </p>
              <p className="text-sm text-zinc-300 leading-relaxed">{log.summary}</p>
            </div>
          )}

          {log.transcript ? (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Transcript
              </p>
              <pre className="whitespace-pre-wrap rounded-lg border border-zinc-700/40 bg-zinc-900/50 p-3 text-xs leading-relaxed text-zinc-400 font-sans">
                {log.transcript}
              </pre>
            </div>
          ) : (
            <p className="text-xs text-zinc-600 italic">No transcript available.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface CallLogsSectionProps {
  agentId: string;
}

export function CallLogsSection({ agentId }: CallLogsSectionProps) {
  const { data: logs, isLoading } = useAgentCallLogs(agentId);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    setExpandedLog((prev) => (prev === id ? null : id));
  };

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/20 p-5 space-y-4">
      {/* Section header */}
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Recent Calls
      </h3>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-2">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && logs.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-zinc-700/50 py-10 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800/60">
            <Phone className="h-4 w-4 text-zinc-600" />
          </div>
          <p className="max-w-xs text-sm text-zinc-500">
            No calls yet. Calls will appear here once your agent starts taking calls.
          </p>
        </div>
      )}

      {/* Call log list */}
      {!isLoading && logs.length > 0 && (
        <div className="space-y-2">
          {(logs as CallLog[]).map((log) => (
            <CallLogRow
              key={log.id}
              log={log}
              expanded={expandedLog === log.id}
              onToggle={() => handleToggle(log.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
