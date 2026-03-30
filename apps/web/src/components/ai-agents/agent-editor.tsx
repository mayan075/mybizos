'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AiAgent, AgentSettings, Vertical, PromptMode, GeminiVoice } from '@hararai/shared';
import { DEFAULT_AGENT_SETTINGS, buildPromptFromTemplate } from '@hararai/shared';
import { useUpdateAgent, useDeleteAgent } from '@/lib/hooks/use-ai-agents';
import { useToast } from '@/components/ui/toast';
import { BusinessContextSection } from './business-context-section';
import { VoicePersonalitySection } from './voice-personality-section';
import { CallSettingsSection } from './call-settings-section';
import { AdvancedPromptSection } from './advanced-prompt-section';
import { CallLogsSection } from './call-logs-section';
import { TestCallPanel } from './test-call-panel';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Safely extract AgentSettings from the agent's Record<string, unknown>. */
function parseSettings(raw: Record<string, unknown>): AgentSettings {
  return {
    ...DEFAULT_AGENT_SETTINGS,
    ...(raw as Partial<AgentSettings>),
  };
}

// ── Props ───────────────────────────────────────────────────────────────────

interface AgentEditorProps {
  agent: AiAgent;
  businessName: string;
  onSaved: () => void;
}

// ── Component ───────────────────────────────────────────────────────────────

export function AgentEditor({ agent, businessName, onSaved }: AgentEditorProps) {
  const router = useRouter();
  const toast = useToast();
  const { mutate: updateAgent, isLoading: isSaving } = useUpdateAgent(agent.id);
  const { mutate: deleteAgent } = useDeleteAgent(agent.id);

  // ── Local state derived from agent prop ──────────────────────────────
  const [name, setName] = useState(agent.name);
  const [vertical, setVertical] = useState<Vertical>(agent.vertical);
  const [settings, setSettings] = useState<AgentSettings>(() => parseSettings(agent.settings));
  const [voiceName, setVoiceName] = useState<GeminiVoice>(settings.voiceConfig.voice);
  const [systemPrompt, setSystemPrompt] = useState(agent.systemPrompt);
  const [isActive, setIsActive] = useState(agent.isActive);

  // ── Dirty tracking ───────────────────────────────────────────────────
  const isDirty = useMemo(() => {
    if (name !== agent.name) return true;
    if (vertical !== agent.vertical) return true;
    if (systemPrompt !== agent.systemPrompt) return true;
    if (isActive !== agent.isActive) return true;
    if (voiceName !== parseSettings(agent.settings).voiceConfig.voice) return true;
    if (JSON.stringify(settings) !== JSON.stringify(parseSettings(agent.settings))) return true;
    return false;
  }, [name, vertical, settings, voiceName, systemPrompt, isActive, agent]);

  // ── Unsaved changes warning ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // ── Prompt auto-regeneration (template mode) ─────────────────────────
  const regeneratePrompt = useCallback(() => {
    if (settings.promptMode !== 'template') return;
    const prompt = buildPromptFromTemplate({
      agentName: name,
      businessName,
      vertical,
      settings,
    });
    setSystemPrompt(prompt);
  }, [name, businessName, vertical, settings]);

  // Trigger regeneration when relevant fields change in template mode
  useEffect(() => {
    if (settings.promptMode === 'template') {
      regeneratePrompt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    name,
    vertical,
    settings.tone,
    settings.greeting,
    settings.escalationThreshold,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(settings.services),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    JSON.stringify(settings.emergencyKeywords),
    settings.promptMode,
  ]);

  // ── Settings change handlers ─────────────────────────────────────────

  /** BusinessContextSection passes full AgentSettings. */
  const handleBusinessSettingsChange = (newSettings: AgentSettings) => {
    setSettings(newSettings);
  };

  /** VoicePersonalitySection and CallSettingsSection pass Partial<AgentSettings>. */
  const handlePartialSettingsChange = (partial: Partial<AgentSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const handleVoiceChange = (voice: string) => {
    const v = voice as GeminiVoice;
    setVoiceName(v);
    setSettings((prev) => ({
      ...prev,
      voiceConfig: { ...prev.voiceConfig, voice: v },
    }));
  };

  const handlePromptModeChange = (mode: PromptMode) => {
    setSettings((prev) => ({ ...prev, promptMode: mode }));
  };

  const handleResetToTemplate = () => {
    const prompt = buildPromptFromTemplate({
      agentName: name,
      businessName,
      vertical,
      settings: { ...settings, promptMode: 'template' },
    });
    setSystemPrompt(prompt);
  };

  // ── Save ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const result = await updateAgent({
      name,
      vertical,
      systemPrompt,
      isActive,
      settings: {
        ...settings,
        voiceConfig: { ...settings.voiceConfig, voice: voiceName as AgentSettings['voiceConfig']['voice'] },
      } as unknown as Record<string, unknown>,
    });

    if (result) {
      toast.success('Agent saved successfully');
      onSaved();
    } else {
      toast.error('Failed to save agent');
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${name}"? This action cannot be undone.`,
    );
    if (!confirmed) return;

    const result = await deleteAgent(undefined as never);
    if (result) {
      toast.success('Agent deleted');
      router.push('/dashboard/settings/ai-agents');
    } else {
      toast.error('Failed to delete agent');
    }
  };

  // ── Derived state ────────────────────────────────────────────────────
  const isCustomMode = settings.promptMode === 'custom';

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Back arrow */}
        <button
          type="button"
          onClick={() => {
            if (isDirty) {
              const leave = window.confirm('You have unsaved changes. Leave anyway?');
              if (!leave) return;
            }
            router.push('/dashboard/settings/ai-agents');
          }}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700/50 bg-zinc-800/40',
            'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          )}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        {/* Agent name input */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={cn(
            'flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-lg font-semibold text-zinc-100',
            'hover:border-zinc-700/50 focus:border-zinc-600 focus:bg-zinc-800/40',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'transition-all',
          )}
        />

        {/* Phone badge */}
        <span className="flex items-center gap-1.5 rounded-full border border-zinc-700/50 bg-zinc-800/40 px-3 py-1 text-xs font-medium text-zinc-400">
          <Phone className="h-3 w-3" />
          Phone
        </span>

        {/* Active/Inactive toggle */}
        <button
          type="button"
          onClick={() => setIsActive((prev) => !prev)}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
            isActive
              ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25'
              : 'bg-zinc-700/30 text-zinc-500 ring-1 ring-zinc-600/30 hover:bg-zinc-700/50',
          )}
        >
          {isActive ? 'Active' : 'Inactive'}
        </button>

        {/* Delete button */}
        <button
          type="button"
          onClick={handleDelete}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700/50 bg-zinc-800/40',
            'text-zinc-500 hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500',
          )}
        >
          <Trash2 className="h-4 w-4" />
        </button>

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-semibold transition-all',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
            isDirty
              ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20'
              : 'bg-zinc-700/50 text-zinc-500 cursor-not-allowed',
            isSaving && 'opacity-60 cursor-wait',
          )}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* ── Sections ────────────────────────────────────────────────────── */}

      <BusinessContextSection
        vertical={vertical}
        businessName={businessName}
        settings={settings}
        onVerticalChange={setVertical}
        onSettingsChange={handleBusinessSettingsChange}
        disabled={isCustomMode}
      />

      <VoicePersonalitySection
        voiceName={voiceName}
        settings={settings}
        onVoiceChange={handleVoiceChange}
        onSettingsChange={handlePartialSettingsChange}
        disabled={isCustomMode}
      />

      <CallSettingsSection
        settings={settings}
        onSettingsChange={handlePartialSettingsChange}
        disabled={isCustomMode}
      />

      <AdvancedPromptSection
        systemPrompt={systemPrompt}
        promptMode={settings.promptMode}
        onPromptChange={setSystemPrompt}
        onModeChange={handlePromptModeChange}
        onResetToTemplate={handleResetToTemplate}
      />

      <TestCallPanel systemPrompt={systemPrompt} voiceName={voiceName} />

      <CallLogsSection agentId={agent.id} />
    </div>
  );
}
