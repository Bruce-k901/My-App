-- Fix: Add INSERT policy for messaging_channels table (Simple Version)
-- This is the simplest possible policy - use if other versions don't work

BEGIN;

-- Enable RLS if not already enabled
ALTER TABLE messaging_channels ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing INSERT policies
DROP POLICY IF EXISTS "Users can create channels in their company" ON messaging_channels;
DROP POLICY IF EXISTS "messaging_channels_insert_company" ON messaging_channels;
DROP POLICY IF EXISTS "channels_insert_company" ON messaging_channels;
DROP POLICY IF EXISTS "Users can insert channels" ON messaging_channels;

-- Create very simple INSERT policy
-- This allows any authenticated user to create channels where they are the creator
CREATE POLICY "Users can create channels" ON messaging_channels
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
);

-- Grant necessary permissions
GRANT INSERT ON messaging_channels TO authenticated;
GRANT SELECT ON messaging_channels TO authenticated;

-- Reload schema
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Verification
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'messaging_channels'
AND cmd = 'INSERT';

