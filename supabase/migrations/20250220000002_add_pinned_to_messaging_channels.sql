-- Migration: Add pinned columns to messaging_channels table
-- This allows users to pin important conversations to the top

BEGIN;

-- Add pinned columns to messaging_channels
ALTER TABLE messaging_channels 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES profiles(id);

-- Create index for filtering pinned conversations
CREATE INDEX IF NOT EXISTS idx_messaging_channels_pinned 
ON messaging_channels (is_pinned, pinned_at DESC NULLS LAST);

-- Add comment
COMMENT ON COLUMN messaging_channels.is_pinned IS 'Whether this conversation is pinned to the top';
COMMENT ON COLUMN messaging_channels.pinned_at IS 'When this conversation was pinned';
COMMENT ON COLUMN messaging_channels.pinned_by IS 'User who pinned this conversation';

-- Update RLS policy to allow users to pin/unpin channels they're members of
-- First, drop existing update policy if it exists
DROP POLICY IF EXISTS "Users can update their channels" ON messaging_channels;

-- Create policy that allows channel members to update channel properties including is_pinned
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

-- Reload schema
NOTIFY pgrst, 'reload schema';

COMMIT;

