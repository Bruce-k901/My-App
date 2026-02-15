-- Fix: Add INSERT policy for messaging_channels table (Minimal Version)
-- This is the absolute simplest policy - just checks created_by matches auth.uid()
-- Use this to test if basic RLS is working, then we can add company checks

BEGIN;

-- Enable RLS if not already enabled
ALTER TABLE messaging_channels ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing INSERT policies
DROP POLICY IF EXISTS "Users can create channels in their company" ON messaging_channels;
DROP POLICY IF EXISTS "messaging_channels_insert_company" ON messaging_channels;
DROP POLICY IF EXISTS "channels_insert_company" ON messaging_channels;
DROP POLICY IF EXISTS "Users can insert channels" ON messaging_channels;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON messaging_channels;

-- Create the simplest possible INSERT policy
-- This ONLY checks that created_by matches the authenticated user
CREATE POLICY "Allow authenticated inserts" ON messaging_channels
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

-- Verification: Check if policy was created
SELECT 
  policyname,
  cmd,
  with_check,
  qual as using_expression
FROM pg_policies
WHERE tablename = 'messaging_channels'
AND cmd = 'INSERT';

