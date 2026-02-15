-- ============================================================================
-- Check a specific user's messaging access by email
-- Replace 'USER_EMAIL_HERE' with the actual email address
-- ============================================================================

-- Check profile
SELECT 
  'Profile' as check_type,
  p.id,
  p.email,
  p.full_name,
  p.company_id,
  p.app_role
FROM public.profiles p
WHERE p.email = 'USER_EMAIL_HERE';  -- Replace with actual email

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
JOIN public.profiles p ON p.id = mcm.profile_id
WHERE p.email = 'USER_EMAIL_HERE'  -- Replace with actual email
ORDER BY mcm.joined_at DESC;

-- Summary
SELECT 
  'Summary' as check_type,
  p.email,
  COUNT(*) as total_memberships,
  COUNT(*) FILTER (WHERE mcm.left_at IS NULL) as active_memberships,
  CASE 
    WHEN COUNT(*) FILTER (WHERE mcm.left_at IS NULL) > 0 THEN '✅ Has messaging access'
    ELSE '❌ No messaging access'
  END as access_status
FROM public.profiles p
LEFT JOIN public.messaging_channel_members mcm ON mcm.profile_id = p.id
WHERE p.email = 'USER_EMAIL_HERE'  -- Replace with actual email
GROUP BY p.email;
