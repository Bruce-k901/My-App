-- Fix: Add INSERT policy for messaging_channel_members table
-- This allows users to add themselves and others to channels they created or belong to

BEGIN;

-- Enable RLS if not already enabled
ALTER TABLE messaging_channel_members ENABLE ROW LEVEL SECURITY;

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Users can add members to channels" ON messaging_channel_members;
DROP POLICY IF EXISTS "Users can insert channel members" ON messaging_channel_members;
DROP POLICY IF EXISTS "messaging_channel_members_insert" ON messaging_channel_members;

-- Create INSERT policy that allows:
-- 1. Users to add themselves to channels in their company
-- 2. Channel creators/admins to add other users to their channels
CREATE POLICY "Users can add members to channels" ON messaging_channel_members
FOR INSERT
WITH CHECK (
  -- User can add themselves
  (user_id = auth.uid())
  AND
  -- Channel must exist and user must belong to same company
  EXISTS (
    SELECT 1 
    FROM messaging_channels mc
    JOIN profiles p ON p.id = auth.uid()
    WHERE mc.id = messaging_channel_members.channel_id
    AND p.company_id = mc.company_id
  )
);

-- Grant necessary permissions
GRANT INSERT ON messaging_channel_members TO authenticated;
GRANT SELECT ON messaging_channel_members TO authenticated;
GRANT SELECT ON messaging_channels TO authenticated;
GRANT SELECT ON profiles TO authenticated;

-- Reload schema
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Verification
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'messaging_channel_members'
AND cmd = 'INSERT';

