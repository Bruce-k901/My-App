-- Fix: Add INSERT policy for messaging_channels table
-- Run this in Supabase SQL Editor to fix the "new row violates row-level security policy" error
-- This allows users to create conversations/channels in their company

BEGIN;

-- Enable RLS if not already enabled
ALTER TABLE messaging_channels ENABLE ROW LEVEL SECURITY;

-- Drop existing INSERT policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Users can create channels in their company" ON messaging_channels;
DROP POLICY IF EXISTS "messaging_channels_insert_company" ON messaging_channels;
DROP POLICY IF EXISTS "channels_insert_company" ON messaging_channels;

-- Create INSERT policy that allows users to create channels in their company
-- Uses the check_user_company_match function from the messaging system migration
CREATE POLICY "Users can create channels in their company" ON messaging_channels
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
  AND public.check_user_company_match(auth.uid(), company_id)
);

-- Add comment
COMMENT ON POLICY "Users can create channels in their company" ON messaging_channels IS 
'Allows authenticated users to create messaging channels/conversations in their own company';

-- Reload schema
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Verification query (optional - run to check policy was created)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'messaging_channels'
AND cmd = 'INSERT';

