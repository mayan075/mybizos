'use client';

import { cn } from '@/lib/utils';
import type { AgentSettings } from '@hararai/shared';

// ── Props ────────────────────────────────────────────────────────────────────

interface CallSettingsSectionProps {
  settings: AgentSettings;
  onSettingsChange: (partial: Partial<AgentSettings>) => void;
  disabled?: boolean;
}

// ── Sub-components ───────────────────────────────────────────────────────────

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleSwitch({ checked, onChange, disabled }: ToggleSwitchProps) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && onChange(!checked)}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onChange(!checked);
        }
      }}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900',
        checked ? 'bg-blue-500' : 'bg-zinc-700',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span
        className={cn(
          'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0.5',
        )}
      />
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function CallSettingsSection({
  settings,
  onSettingsChange,
  disabled,
}: CallSettingsSectionProps) {
  const maxDurationMinutes =
    typeof (settings as unknown as { maxDurationMinutes?: number }).maxDurationMinutes === 'number'
      ? (settings as unknown as { maxDurationMinutes: number }).maxDurationMinutes
      : 15;

  const recordCalls =
    typeof (settings as unknown as { recordCalls?: boolean }).recordCalls === 'boolean'
      ? (settings as unknown as { recordCalls: boolean }).recordCalls
      : true;

  const handleKeywordsChange = (raw: string) => {
    const keywords = raw
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    onSettingsChange({ emergencyKeywords: keywords });
  };

  return (
    <div className="space-y-5 rounded-xl border border-zinc-700/50 bg-zinc-800/20 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
        Call Settings
      </h3>

      {/* Max call duration */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-zinc-400">Max Call Duration</label>
          <span className="text-xs font-semibold tabular-nums text-zinc-200">
            {maxDurationMinutes} min
          </span>
        </div>
        <input
          type="range"
          min={5}
          max={30}
          step={1}
          value={maxDurationMinutes}
          disabled={disabled}
          onChange={(e) =>
            onSettingsChange({
              ...(settings as object),
              maxDurationMinutes: Number(e.target.value),
            } as Partial<AgentSettings>)
          }
          className={cn(
            'w-full accent-blue-500 disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
        <div className="flex justify-between text-[10px] text-zinc-600">
          <span>5 min</span>
          <span>30 min</span>
        </div>
      </div>

      {/* Record calls toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-zinc-300">Record Calls</p>
          <p className="text-[11px] text-zinc-600">
            Recordings are stored for 30 days and used for quality review.
          </p>
        </div>
        <ToggleSwitch
          checked={recordCalls}
          onChange={(val) =>
            onSettingsChange({
              ...(settings as object),
              recordCalls: val,
            } as Partial<AgentSettings>)
          }
          disabled={disabled}
        />
      </div>

      {/* Escalation threshold */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-zinc-400">Escalation Threshold</label>
          <span className="text-xs font-semibold tabular-nums text-zinc-200">
            {settings.escalationThreshold} misunderstandings
          </span>
        </div>
        <input
          type="range"
          min={2}
          max={8}
          step={1}
          value={settings.escalationThreshold}
          disabled={disabled}
          onChange={(e) =>
            onSettingsChange({ escalationThreshold: Number(e.target.value) })
          }
          className="w-full accent-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="text-[11px] text-zinc-600">
          Number of times the AI fails to understand before routing the caller to a human.
        </p>
      </div>

      {/* Emergency keywords */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-zinc-400">
          Emergency Keywords
        </label>
        <input
          type="text"
          value={settings.emergencyKeywords.join(', ')}
          onChange={(e) => handleKeywordsChange(e.target.value)}
          disabled={disabled}
          placeholder="flooding, gas leak, fire, burst pipe…"
          className={cn(
            'w-full rounded-lg border bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100',
            'border-zinc-700 placeholder:text-zinc-600',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
        <p className="text-[11px] text-zinc-600">
          Comma-separated. When detected, the agent immediately alerts the team.
        </p>
      </div>
    </div>
  );
}
