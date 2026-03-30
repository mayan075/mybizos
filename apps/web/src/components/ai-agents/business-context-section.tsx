'use client';

import { cn } from '@/lib/utils';
import type { AgentSettings } from '@hararai/shared';
import { INDUSTRY_LABELS, getIndustryDefaults } from '@hararai/shared';
import { ServicesListEditor } from './services-list-editor';

// ── Props ────────────────────────────────────────────────────────────────────

interface BusinessContextSectionProps {
  industry: string;
  businessName: string;
  settings: AgentSettings;
  onIndustryChange: (industry: string) => void;
  onSettingsChange: (settings: AgentSettings) => void;
  disabled?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export function BusinessContextSection({
  industry,
  businessName,
  settings,
  onIndustryChange,
  onSettingsChange,
  disabled,
}: BusinessContextSectionProps) {
  const handleIndustryChange = (newIndustry: string) => {
    if (settings.services.length > 0) {
      const confirmed = window.confirm(
        `Switching to "${INDUSTRY_LABELS[newIndustry] ?? newIndustry}" will replace your current services list with defaults for that industry. Continue?`,
      );
      if (!confirmed) return;
    }

    const defaults = getIndustryDefaults(newIndustry);
    onIndustryChange(newIndustry);
    onSettingsChange({
      ...settings,
      services: defaults.defaultServices,
    });
  };

  const handleServicesChange = (services: AgentSettings['services']) => {
    onSettingsChange({ ...settings, services });
  };

  return (
    <section
      className={cn(
        'rounded-xl border border-zinc-700/40 bg-zinc-800/20 p-5 space-y-5',
      )}
    >
      {/* Section title */}
      <h3 className="text-sm font-semibold text-zinc-100">Business Context</h3>

      {/* Business name (read-only, sourced from org) */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-zinc-400">
          Business Name
        </label>
        <input
          type="text"
          value={businessName}
          disabled
          readOnly
          className={cn(
            'w-full rounded-lg border bg-zinc-800/50 px-3 py-2 text-sm text-zinc-400',
            'border-zinc-700/50 cursor-not-allowed opacity-60',
          )}
        />
        <p className="text-[11px] text-zinc-600">
          Sourced from your organisation settings.
        </p>
      </div>

      {/* Industry dropdown */}
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-zinc-400">
          Industry
        </label>
        <select
          value={industry}
          onChange={(e) => handleIndustryChange(e.target.value)}
          disabled={disabled}
          className={cn(
            'w-full rounded-lg border bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100',
            'border-zinc-700 appearance-none',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {Object.entries(INDUSTRY_LABELS).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ),
          )}
        </select>
        <p className="text-[11px] text-zinc-600">
          Changing the industry will load default services for that industry.
        </p>
      </div>

      {/* Services list */}
      <ServicesListEditor
        services={settings.services}
        onChange={handleServicesChange}
        disabled={disabled}
      />
    </section>
  );
}
