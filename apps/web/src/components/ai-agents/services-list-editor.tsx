'use client';

import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentService } from '@hararai/shared';

// ── Props ────────────────────────────────────────────────────────────────────

interface ServicesListEditorProps {
  services: AgentService[];
  onChange: (services: AgentService[]) => void;
  disabled?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ServicesListEditor({ services, onChange, disabled }: ServicesListEditorProps) {
  const handleAdd = () => {
    onChange([...services, { name: '', priceLow: 0, priceHigh: 0 }]);
  };

  const handleDelete = (index: number) => {
    onChange(services.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof AgentService, value: string | number) => {
    const updated = services.map((service, i) => {
      if (i !== index) return service;
      return { ...service, [field]: value };
    });
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {/* Header row with Add button */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
          Services &amp; Pricing
        </span>
        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
            'bg-blue-500/10 text-blue-400 border border-blue-500/20',
            'hover:bg-blue-500/20 hover:border-blue-500/30',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Service
        </button>
      </div>

      {/* Empty state */}
      {services.length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-700/50 bg-zinc-800/30 py-6 text-center">
          <p className="text-sm text-zinc-500">
            No services added yet. Click &quot;Add Service&quot; to get started.
          </p>
        </div>
      )}

      {/* Service rows */}
      {services.length > 0 && (
        <div className="space-y-2">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_80px_80px_36px] gap-2 px-1">
            <span className="text-[11px] text-zinc-500">Service name</span>
            <span className="text-[11px] text-zinc-500">Price low</span>
            <span className="text-[11px] text-zinc-500">Price high</span>
            <span />
          </div>

          {services.map((service, index) => (
            <div
              key={index}
              className="grid grid-cols-[1fr_80px_80px_36px] gap-2 items-center"
            >
              {/* Name */}
              <input
                type="text"
                value={service.name}
                onChange={(e) => handleChange(index, 'name', e.target.value)}
                disabled={disabled}
                placeholder="e.g. Drain cleaning"
                className={cn(
                  'w-full rounded-lg border bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100',
                  'border-zinc-700 placeholder:text-zinc-600',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              />

              {/* Price low */}
              <input
                type="number"
                value={service.priceLow}
                onChange={(e) => handleChange(index, 'priceLow', Number(e.target.value))}
                disabled={disabled}
                min={0}
                placeholder="0"
                className={cn(
                  'w-full rounded-lg border bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100',
                  'border-zinc-700 placeholder:text-zinc-600',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              />

              {/* Price high */}
              <input
                type="number"
                value={service.priceHigh}
                onChange={(e) => handleChange(index, 'priceHigh', Number(e.target.value))}
                disabled={disabled}
                min={0}
                placeholder="0"
                className={cn(
                  'w-full rounded-lg border bg-zinc-800/50 px-3 py-2 text-sm text-zinc-100',
                  'border-zinc-700 placeholder:text-zinc-600',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              />

              {/* Delete */}
              <button
                type="button"
                onClick={() => handleDelete(index)}
                disabled={disabled}
                aria-label={`Remove ${service.name || 'service'}`}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                  'text-zinc-500 hover:text-red-400 hover:bg-red-500/10',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
