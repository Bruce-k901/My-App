-- ============================================================================
-- Test RLS logic with actual user data
-- Replace 'bruce@e-a-g.co' with your email
-- ============================================================================

-- Get your profile and auth user ID
SELECT 
  'Your Profile' as check_type,
  p.id as profile_id,
  p.email,
  au.id as auth_user_id,
  CASE 
    WHEN p.id = au.id THEN '✅ Profile ID matches auth user ID'
    ELSE '❌ MISMATCH - This is the problem!'
  END as id_match
FROM public.profiles p
LEFT JOIN auth.users au ON au.id = p.id
WHERE p.email = 'bruce@e-a-g.co';

-- Check your channel memberships
SELECT 
  'Your Channel Memberships' as check_type,
  mcm.channel_id,
  mcm.profile_id,
  mc.name as channel_name,
  mcm.left_at,
  CASE 
    WHEN mcm.left_at IS NULL THEN '✅ Active'
    ELSE '❌ Left'
  END as status
FROM public.messaging_channel_members mcm
JOIN public.messaging_channels mc ON mc.id = mcm.channel_id
JOIN public.profiles p ON p.id = mcm.profile_id
WHERE p.email = 'bruce@e-a-g.co'
ORDER BY mcm.joined_at DESC;

-- Test if RLS would work: Check if profile_id in memberships matches auth user ID
SELECT 
  'RLS Test' as check_type,
  mcm.channel_id,
  mcm.profile_id as membership_profile_id,
  (SELECT id FROM auth.users WHERE id = (SELECT id FROM public.profiles WHERE email = 'bruce@e-a-g.co')) as auth_user_id,
  CASE 
    WHEN mcm.profile_id = (SELECT id FROM auth.users WHERE id = (SELECT id FROM public.profiles WHERE email = 'bruce@e-a-g.co'))
      AND mcm.left_at IS NULL
    THEN '✅ RLS would allow (profile_id matches auth.uid() and active)'
    ELSE '❌ RLS would block'
  END as rls_result
FROM public.messaging_channel_members mcm
JOIN public.profiles p ON p.id = mcm.profile_id
WHERE p.email = 'bruce@e-a-g.co'
LIMIT 5;
