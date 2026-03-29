-- Rename the JSONB key mybizosPhone to managedPhone in organizations.settings
-- Safe to re-run: skips rows that already have the new key.
UPDATE organizations
SET settings = settings - 'mybizosPhone' || jsonb_build_object('managedPhone', settings->'mybizosPhone')
WHERE settings ? 'mybizosPhone'
  AND NOT (settings ? 'managedPhone');
