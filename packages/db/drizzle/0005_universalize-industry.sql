-- Migration: Replace vertical enum with free-text industry columns
-- This enables any business type to use the platform, not just trades.

-- Step 1: Add new industry columns to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry_category text;

-- Step 2: Add new industry column to ai_agents
ALTER TABLE ai_agents ADD COLUMN IF NOT EXISTS industry text;

-- Step 3: Backfill from existing vertical enum
UPDATE organizations SET industry = vertical::text WHERE industry IS NULL AND vertical IS NOT NULL;
UPDATE organizations SET industry_category = vertical::text WHERE industry_category IS NULL AND vertical IS NOT NULL;
UPDATE organizations SET industry = 'general' WHERE industry IS NULL;
UPDATE ai_agents SET industry = vertical::text WHERE industry IS NULL AND vertical IS NOT NULL;
UPDATE ai_agents SET industry = 'general' WHERE industry IS NULL;

-- Step 4: Make industry NOT NULL with default
ALTER TABLE organizations ALTER COLUMN industry SET NOT NULL;
ALTER TABLE organizations ALTER COLUMN industry SET DEFAULT 'general';
ALTER TABLE ai_agents ALTER COLUMN industry SET NOT NULL;
ALTER TABLE ai_agents ALTER COLUMN industry SET DEFAULT 'general';

-- Step 5: Make old vertical column nullable (keeping for now, will drop in future migration)
ALTER TABLE organizations ALTER COLUMN vertical DROP NOT NULL;
ALTER TABLE ai_agents ALTER COLUMN vertical DROP NOT NULL;
