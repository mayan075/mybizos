'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  RotateCcw,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { validatePromptCompliance } from '@hararai/shared';
import type { PromptMode, PromptValidationIssue } from '@hararai/shared';

// ── Props ────────────────────────────────────────────────────────────────────

interface AdvancedPromptSectionProps {
  systemPrompt: string;
  promptMode: PromptMode;
  onPromptChange: (prompt: string) => void;
  onModeChange: (mode: PromptMode) => void;
  onResetToTemplate: () => void;
  disabled?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export function AdvancedPromptSection({
  systemPrompt,
  promptMode,
  onPromptChange,
  onModeChange,
  onResetToTemplate,
  disabled,
}: AdvancedPromptSectionProps) {
  const [expanded, setExpanded] = useState(false);

  const issues: PromptValidationIssue[] = validatePromptCompliance(systemPrompt);
  const errors   = issues.filter((i) => i.type === 'error');
  const warnings = issues.filter((i) => i.type === 'warning');

  const handlePromptChange = (value: string) => {
    if (promptMode === 'template') {
      onModeChange('custom');
    }
    onPromptChange(value);
  };

  const handleResetToTemplate = () => {
    const confirmed = window.confirm(
      'Reset the system prompt to the auto-generated template? Any custom edits will be lost.',
    );
    if (!confirmed) return;
    onModeChange('template');
    onResetToTemplate();
  };

  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/20">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'flex w-full items-center justify-between px-5 py-4',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500',
          expanded ? 'rounded-t-xl' : 'rounded-xl',
        )}
      >
        <div className="flex items-center gap-2">
          <ChevronIcon className="h-4 w-4 text-zinc-500" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Advanced: System Prompt
          </h3>
          {promptMode === 'custom' && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
              Custom
            </span>
          )}
          {errors.length > 0 && (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-400">
              {errors.length} error{errors.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span className="text-[11px] text-zinc-600">
          {expanded ? 'Collapse' : 'Edit raw prompt'}
        </span>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-zinc-700/50 px-5 pb-5 pt-4">
          {/* Custom mode warning banner */}
          {promptMode === 'custom' && (
            <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <p className="text-xs text-amber-300">
                  You are editing the raw system prompt. The template will no longer
                  auto-update when you change agent settings above.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetToTemplate}
                disabled={disabled}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-amber-300',
                  'hover:bg-amber-500/20 transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                <RotateCcw className="h-3 w-3" />
                Reset to template
              </button>
            </div>
          )}

          {/* Prompt textarea */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-400">
              System Prompt
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              disabled={disabled}
              rows={20}
              spellCheck={false}
              className={cn(
                'w-full resize-y rounded-lg border bg-zinc-900/60 px-3 py-2.5 font-mono text-xs leading-relaxed text-zinc-200',
                'border-zinc-700 placeholder:text-zinc-600',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            />
          </div>

          {/* Validation issues */}
          {issues.length > 0 && (
            <div className="space-y-2">
              {errors.map((issue, i) => (
                <div
                  key={`error-${i}`}
                  className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5"
                >
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                  <p className="text-xs text-red-300">{issue.message}</p>
                </div>
              ))}
              {warnings.map((issue, i) => (
                <div
                  key={`warning-${i}`}
                  className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <p className="text-xs text-amber-300">{issue.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* No issues confirmation */}
          {issues.length === 0 && systemPrompt.trim().length > 0 && (
            <p className="text-[11px] text-zinc-600">
              No compliance issues detected.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
