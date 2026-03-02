-- Fix: Update messaging_channels INSERT policy to allow all users in their company
-- This replaces the admin-only policy with one that allows all authenticated users

BEGIN;

-- Enable RLS if not already enabled
ALTER TABLE messaging_channels ENABLE ROW LEVEL SECURITY;

-- Drop the admin-only policy
DROP POLICY IF EXISTS "Admins can create channels" ON messaging_channels;

-- Drop any other INSERT policies to start fresh
DROP POLICY IF EXISTS "Users can create channels in their company" ON messaging_channels;
DROP POLICY IF EXISTS "messaging_channels_insert_company" ON messaging_channels;
DROP POLICY IF EXISTS "channels_insert_company" ON messaging_channels;
DROP POLICY IF EXISTS "Users can insert channels" ON messaging_channels;
DROP POLICY IF EXISTS "Allow all authenticated inserts" ON messaging_channels;

-- Create a policy that allows any authenticated user to create channels in their company
-- This checks that:
-- 1. The user is authenticated (created_by = auth.uid())
-- 2. The user belongs to the same company as the channel
CREATE POLICY "Users can create channels in their company" ON messaging_channels
FOR INSERT
WITH CHECK (
  -- User must be the creator
  created_by = auth.uid()
  AND
  -- User must belong to the same company
  EXISTS (
    SELECT 1 
    FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.company_id = messaging_channels.company_id
  )
);

-- Grant necessary permissions
GRANT INSERT ON messaging_channels TO authenticated;
GRANT SELECT ON messaging_channels TO authenticated;
GRANT SELECT ON profiles TO authenticated;

-- Reload schema
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Verification: Check that only one INSERT policy exists now
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'messaging_channels'
AND cmd = 'INSERT';

-- Expected result: Should show only "Users can create channels in their company"

