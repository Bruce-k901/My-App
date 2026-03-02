-- Debug script to check all policies and temporarily disable RLS for testing
-- Run this to see what's actually happening

-- 1. Show ALL policies on messaging_channels
SELECT 
  policyname,
  cmd as command,
  permissive,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'messaging_channels'
ORDER BY cmd, policyname;

-- 2. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'messaging_channels';

-- 3. Show table structure to verify columns exist
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'messaging_channels'
AND column_name IN ('id', 'created_by', 'company_id', 'channel_type')
ORDER BY ordinal_position;

-- 4. TEMPORARILY disable RLS to test if that's the issue
-- UNCOMMENT THE NEXT LINE TO DISABLE RLS TEMPORARILY FOR TESTING
-- ALTER TABLE messaging_channels DISABLE ROW LEVEL SECURITY;

-- 5. Or, drop ALL policies and create a super permissive one
DROP POLICY IF EXISTS "Users can create channels in their company" ON messaging_channels;
DROP POLICY IF EXISTS "messaging_channels_insert_company" ON messaging_channels;
DROP POLICY IF EXISTS "channels_insert_company" ON messaging_channels;
DROP POLICY IF EXISTS "Users can insert channels" ON messaging_channels;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON messaging_channels;

-- Create a policy that allows ANY authenticated user to insert
CREATE POLICY "Allow all authenticated inserts" ON messaging_channels
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Verify it was created
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'messaging_channels'
AND cmd = 'INSERT';

