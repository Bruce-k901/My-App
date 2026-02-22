-- Fix: Complete fix for messaging_channel_members table
-- 1. Add INSERT policy
-- 2. Fix foreign key relationship for Supabase queries

BEGIN;

-- Enable RLS if not already enabled
ALTER TABLE messaging_channel_members ENABLE ROW LEVEL SECURITY;

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Users can add members to channels" ON messaging_channel_members;
DROP POLICY IF EXISTS "Users can insert channel members" ON messaging_channel_members;
DROP POLICY IF EXISTS "messaging_channel_members_insert" ON messaging_channel_members;
DROP POLICY IF EXISTS "participants_insert_company" ON messaging_channel_members;

-- Create INSERT policy using security definer function to avoid RLS recursion
-- This allows users to add themselves and others to channels in their company
CREATE POLICY "Users can add members to channels" ON messaging_channel_members
FOR INSERT
WITH CHECK (
  -- User can add themselves or others
  EXISTS (
    SELECT 1 
    FROM messaging_channels mc
    WHERE mc.id = messaging_channel_members.channel_id
    AND (
      -- User is the channel creator
      mc.created_by = auth.uid()
      OR
      -- User belongs to the same company as the channel
      EXISTS (
        SELECT 1 
        FROM profiles p
        WHERE p.id = auth.uid()
        AND p.company_id = mc.company_id
      )
    )
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

-- Check if foreign key relationship exists for Supabase queries
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'messaging_channel_members'
  AND kcu.column_name = 'user_id';

