-- ============================================================================
-- Check if a specific user has proper setup
-- Replace 'USER_EMAIL_HERE' with the actual user's email
-- ============================================================================

-- First, show all users to help find the right email
SELECT 
  'All users (first 20)' as info,
  email,
  full_name,
  company_id,
  app_role
FROM public.profiles
ORDER BY created_at DESC
LIMIT 20;

-- Check auth user
SELECT 
  'auth.users' as check_type,
  id,
  email,
  raw_user_meta_data->>'company_name' as company_name_from_metadata,
  created_at,
  CASE 
    WHEN id IN (SELECT id FROM public.profiles) THEN '✅ Has profile'
    ELSE '❌ No profile'
  END as profile_status
FROM auth.users
WHERE email = 'USER_EMAIL_HERE'  -- Replace with actual email
LIMIT 1;

-- Check profile
SELECT 
  'profiles' as check_type,
  id,
  email,
  full_name,
  company_id,
  app_role,
  status,
  CASE 
    WHEN id IN (SELECT id FROM auth.users) THEN '✅ Has auth user'
    ELSE '❌ No auth user'
  END as auth_status
FROM public.profiles
WHERE email = 'USER_EMAIL_HERE'  -- Replace with actual email
LIMIT 1;

-- Check company
SELECT 
  'company' as check_type,
  c.id,
  c.name,
  c.company_id as company_company_id
FROM public.companies c
JOIN public.profiles p ON p.company_id = c.id
WHERE p.email = 'USER_EMAIL_HERE'  -- Replace with actual email
LIMIT 1;

-- Check channel memberships
SELECT 
  'channel_memberships' as check_type,
  mcm.channel_id,
  mcm.profile_id,
  mcm.member_role,
  mcm.left_at,
  mc.name as channel_name
FROM public.messaging_channel_members mcm
JOIN public.messaging_channels mc ON mc.id = mcm.channel_id
JOIN public.profiles p ON p.id = mcm.profile_id
WHERE p.email = 'USER_EMAIL_HERE'  -- Replace with actual email
ORDER BY mcm.joined_at DESC
LIMIT 10;
