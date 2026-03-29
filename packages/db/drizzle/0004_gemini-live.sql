-- Migration: Add Gemini Live API support
-- Replaces Vapi as the voice AI provider

-- Add Gemini config to ai_agents (coexists with vapi columns during transition)
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS gemini_config jsonb DEFAULT '{}' NOT NULL;

-- Add usage tracking and provider to ai_call_logs
ALTER TABLE ai_call_logs ADD COLUMN IF NOT EXISTS provider text DEFAULT 'vapi';
ALTER TABLE ai_call_logs ADD COLUMN IF NOT EXISTS audio_duration_in_ms integer DEFAULT 0;
ALTER TABLE ai_call_logs ADD COLUMN IF NOT EXISTS audio_duration_out_ms integer DEFAULT 0;
ALTER TABLE ai_call_logs ADD COLUMN IF NOT EXISTS text_tokens_in integer DEFAULT 0;
ALTER TABLE ai_call_logs ADD COLUMN IF NOT EXISTS text_tokens_out integer DEFAULT 0;
ALTER TABLE ai_call_logs ADD COLUMN IF NOT EXISTS actual_cost numeric(10, 4);

-- Backfill existing agents with default Gemini config
UPDATE ai_agents SET gemini_config = jsonb_build_object(
  'voiceName', 'Kore',
  'thinkingLevel', 'MINIMAL',
  'maxDurationSeconds', 900
) WHERE gemini_config = '{}';
