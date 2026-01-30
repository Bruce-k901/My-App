-- ============================================================================
-- Check current user's messaging access
-- This will show if you're a member of any channels
-- ============================================================================

-- Check current authenticated user
SELECT 
  'Current User' as check_type,
  auth.uid() as user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as email;

-- Check profile
SELECT 
  'Profile' as check_type,
  p.id,
  p.email,
  p.full_name,
  p.company_id,
  p.app_role
FROM public.profiles p
WHERE p.id = auth.uid();

-- Check channel memberships
SELECT 
  'Channel Memberships' as check_type,
  mcm.channel_id,
  mcm.profile_id,
  mcm.member_role,
  mcm.left_at,
  mcm.joined_at,
  mc.name as channel_name,
  mc.company_id,
  CASE 
    WHEN mcm.left_at IS NULL THEN '✅ Active member'
    ELSE '❌ Left channel'
  END as status
FROM public.messaging_channel_members mcm
JOIN public.messaging_channels mc ON mc.id = mcm.channel_id
WHERE mcm.profile_id = auth.uid()
ORDER BY mcm.joined_at DESC;

-- Check if user has ANY active memberships
SELECT 
  'Summary' as check_type,
  COUNT(*) as total_memberships,
  COUNT(*) FILTER (WHERE left_at IS NULL) as active_memberships,
  CASE 
    WHEN COUNT(*) FILTER (WHERE left_at IS NULL) > 0 THEN '✅ Has messaging access'
    ELSE '❌ No messaging access - user needs to be added to a channel'
  END as access_status
FROM public.messaging_channel_members
WHERE profile_id = auth.uid();
