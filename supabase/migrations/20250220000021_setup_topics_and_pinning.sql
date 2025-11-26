-- Migration: Setup topics and pinning for messaging_channels
-- This ensures all required columns exist and sets default topics for existing channels

BEGIN;

-- Add topic column if missing (for display topic with emoji)
ALTER TABLE messaging_channels 
ADD COLUMN IF NOT EXISTS topic TEXT;

-- Add topic_category if missing (for filtering)
ALTER TABLE messaging_channels 
ADD COLUMN IF NOT EXISTS topic_category TEXT CHECK (topic_category IN (
  'safety',
  'maintenance', 
  'operations',
  'hr',
  'compliance',
  'incidents',
  'general'
));

-- Add pinning columns if missing
ALTER TABLE messaging_channels 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES profiles(id);

-- Set default topic_category for existing channels that don't have one
UPDATE messaging_channels
SET topic_category = 'general'
WHERE topic_category IS NULL;

-- Set default topic for existing channels that don't have one
UPDATE messaging_channels
SET topic = '💬 General'
WHERE topic IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messaging_channels_topic_category 
ON messaging_channels(topic_category);

CREATE INDEX IF NOT EXISTS idx_messaging_channels_topic 
ON messaging_channels(topic) WHERE topic IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messaging_channels_pinned 
ON messaging_channels (is_pinned, pinned_at DESC NULLS LAST);

-- Update RLS policy to allow users to pin/unpin channels they're members of
DROP POLICY IF EXISTS "Users can update their channels" ON messaging_channels;

CREATE POLICY "Users can update their channels" ON messaging_channels
FOR UPDATE 
USING (
  id IN (
    SELECT channel_id 
    FROM messaging_channel_members 
    WHERE user_id = auth.uid() 
    AND left_at IS NULL
  )
)
WITH CHECK (
  id IN (
    SELECT channel_id 
    FROM messaging_channel_members 
    WHERE user_id = auth.uid() 
    AND left_at IS NULL
  )
);

-- Add comments
COMMENT ON COLUMN messaging_channels.topic IS 'Display topic with emoji (e.g., 🛡️ Safety)';
COMMENT ON COLUMN messaging_channels.topic_category IS 'Category for filtering (safety, maintenance, etc.)';
COMMENT ON COLUMN messaging_channels.is_pinned IS 'Whether this conversation is pinned to the top';
COMMENT ON COLUMN messaging_channels.pinned_at IS 'When this conversation was pinned';
COMMENT ON COLUMN messaging_channels.pinned_by IS 'User who pinned this conversation';

-- Reload schema
NOTIFY pgrst, 'reload schema';

COMMIT;

