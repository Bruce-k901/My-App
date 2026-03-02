-- Fix: Add INSERT policy for messaging_channels table (Version 2 - More explicit)
-- This version uses a direct check instead of relying on the function
-- Run this if the previous version didn't work

BEGIN;

-- Enable RLS if not already enabled
ALTER TABLE messaging_channels ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing INSERT policies (for clean slate)
DROP POLICY IF EXISTS "Users can create channels in their company" ON messaging_channels;
DROP POLICY IF EXISTS "messaging_channels_insert_company" ON messaging_channels;
DROP POLICY IF EXISTS "channels_insert_company" ON messaging_channels;
DROP POLICY IF EXISTS "Users can insert channels" ON messaging_channels;

-- Create INSERT policy with direct profile check (more reliable)
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

-- Alternative: If the above doesn't work, try this simpler version
-- (Uncomment if needed)
/*
CREATE POLICY "Users can create channels in their company" ON messaging_channels
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND company_id IS NOT NULL
);
*/

-- Add comment
COMMENT ON POLICY "Users can create channels in their company" ON messaging_channels IS 
'Allows authenticated users to create messaging channels/conversations in their own company';

-- Grant necessary permissions (if not already granted)
GRANT INSERT ON messaging_channels TO authenticated;
GRANT SELECT ON messaging_channels TO authenticated;
GRANT SELECT ON profiles TO authenticated;

-- Reload schema
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Verification: Check if policy was created
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'messaging_channels'
AND cmd = 'INSERT';

