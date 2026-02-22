-- Test script to check if RLS policies are working
-- Run this to see what's actually blocking

-- Check current user
SELECT 
  'Current authenticated user' as check_type,
  auth.uid() as user_id;

-- Check if user is a member of any channels
SELECT 
  'User channel memberships' as check_type,
  mcm.channel_id,
  mcm.profile_id,
  mcm.left_at,
  mc.name as channel_name
FROM public.messaging_channel_members mcm
JOIN public.messaging_channels mc ON mc.id = mcm.channel_id
WHERE mcm.profile_id = auth.uid()
LIMIT 5;

-- Check typing_indicators structure
SELECT 
  'typing_indicators columns' as check_type,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'typing_indicators'
ORDER BY ordinal_position;

-- Check what policies exist
SELECT 
  'typing_indicators policies' as check_type,
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'typing_indicators'
AND schemaname = 'public';

SELECT 
  'messaging_messages policies' as check_type,
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'messaging_messages'
AND schemaname = 'public';
