-- ============================================================================
-- Check User Profile and Fix Issues
-- ============================================================================
-- Run this to diagnose and fix profile issues for user:
-- 232039a6-614f-4c66-97b5-447dd5968fb4
-- ============================================================================

-- Check if user exists in auth.users
SELECT 
  'User in auth.users' as check_type,
  id,
  email,
  created_at
FROM auth.users
WHERE id = '232039a6-614f-4c66-97b5-447dd5968fb4';

-- Check if profile exists
SELECT 
  'Profile exists' as check_type,
  id,
  email,
  full_name,
  company_id,
  app_role,
  created_at
FROM public.profiles
WHERE id = '232039a6-614f-4c66-97b5-447dd5968fb4';

-- Check RLS policies on profiles
SELECT 
  'RLS Policy' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- If profile doesn't exist, create it (uncomment to run):
/*
INSERT INTO public.profiles (id, email, full_name, app_role, company_id)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as full_name,
  'staff'::app_role_enum as app_role,
  NULL as company_id -- Will be set during onboarding
FROM auth.users u
WHERE u.id = '232039a6-614f-4c66-97b5-447dd5968fb4'
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
  );
*/

-- Check if profile has company_id (required for notifications)
SELECT 
  'Profile company_id check' as check_type,
  id,
  email,
  company_id,
  CASE 
    WHEN company_id IS NULL THEN '❌ Profile missing company_id - user needs to complete onboarding'
    ELSE '✅ Profile has company_id'
  END as status
FROM public.profiles
WHERE id = '232039a6-614f-4c66-97b5-447dd5968fb4';


