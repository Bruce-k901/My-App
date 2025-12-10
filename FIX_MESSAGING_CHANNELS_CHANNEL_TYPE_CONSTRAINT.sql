-- Fix: Update channel_type constraint to allow 'direct', 'group', 'site', 'team'
-- The constraint might be expecting different values

BEGIN;

-- First, check what the current constraint allows
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'messaging_channels'::regclass
AND contype = 'c'
AND (conname LIKE '%channel_type%' OR pg_get_constraintdef(oid) LIKE '%channel_type%');

-- Drop the existing constraint if it exists
ALTER TABLE messaging_channels 
DROP CONSTRAINT IF EXISTS messaging_channels_channel_type_check;

ALTER TABLE messaging_channels 
DROP CONSTRAINT IF EXISTS chk_channel_type;

-- Add the correct constraint that allows: direct, group, site, team
ALTER TABLE messaging_channels
ADD CONSTRAINT messaging_channels_channel_type_check 
CHECK (channel_type IN ('direct', 'group', 'site', 'team'));

COMMIT;

-- Verify the constraint was created
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'messaging_channels'::regclass
AND contype = 'c'
AND (conname LIKE '%channel_type%' OR pg_get_constraintdef(oid) LIKE '%channel_type%');

