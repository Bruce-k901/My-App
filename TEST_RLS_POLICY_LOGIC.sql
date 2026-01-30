-- ============================================================================
-- Test if RLS policies would work for a specific user and channel
-- Replace the values below with actual IDs
-- ============================================================================

-- For Supabase SQL Editor, use variables in DO block
DO $$
DECLARE
  test_user_email TEXT := 'bruce@e-a-g.co';
  test_channel_id UUID := 'REPLACE_WITH_CHANNEL_ID_FROM_CHECK'::uuid;  -- Get this from CHECK_WHICH_CHANNEL_YOURE_USING.sql

BEGIN
  RAISE NOTICE 'Testing RLS for user: %, channel: %', test_user_email, test_channel_id;
END $$;

-- Get user profile ID
SELECT 
  'User Info' as check_type,
  p.id as profile_id,
  p.email,
  (SELECT id FROM auth.users WHERE id = p.id) as auth_user_id,
  CASE 
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = p.id) THEN '✅ Has auth account'
    ELSE '❌ No auth account'
  END as auth_status
FROM public.profiles p
WHERE p.email = 'bruce@e-a-g.co';  -- Replace with your email

-- Check if user is member of the test channel
-- First, get a channel ID from your memberships, then replace it below
SELECT 
  'Channel Membership Check' as check_type,
  mcm.channel_id,
  mcm.profile_id,
  mcm.left_at,
  CASE 
    WHEN mcm.left_at IS NULL THEN '✅ Active member'
    ELSE '❌ Left channel'
  END as membership_status,
  CASE 
    WHEN mcm.profile_id = (SELECT id FROM public.profiles WHERE email = 'bruce@e-a-g.co')
      AND mcm.left_at IS NULL
    THEN '✅ RLS would allow access'
    ELSE '❌ RLS would block - not a member or left channel'
  END as rls_result
FROM public.messaging_channel_members mcm
WHERE mcm.profile_id = (SELECT id FROM public.profiles WHERE email = 'bruce@e-a-g.co')
ORDER BY mcm.joined_at DESC;
