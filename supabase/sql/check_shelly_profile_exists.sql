-- ============================================================================
-- CHECK IF SHELLY'S PROFILE EXISTS AND IDS MATCH
-- ============================================================================

-- Step 1: Check if profile exists for the auth user ID
SELECT 
  '=== PROFILE FOR AUTH USER ID ===' AS section,
  id,
  email,
  full_name,
  company_id,
  site_id,
  app_role,
  created_at
FROM public.profiles
WHERE id = 'b7e28f87-fee8-4ca9-bad2-b5ac003acb62';

-- Step 2: Check if profile exists by email
SELECT 
  '=== PROFILE BY EMAIL ===' AS section,
  id,
  email,
  full_name,
  company_id,
  site_id,
  app_role,
  created_at
FROM public.profiles
WHERE email = 'lee@e-a-g.co';

-- Step 3: Compare auth user ID with profile ID
SELECT 
  '=== ID COMPARISON ===' AS section,
  au.id AS auth_user_id,
  p.id AS profile_id,
  au.email AS auth_email,
  p.email AS profile_email,
  au.id = p.id AS ids_match,
  p.company_id,
  p.app_role,
  CASE 
    WHEN p.id IS NULL THEN '❌ Profile does not exist'
    WHEN au.id != p.id THEN '⚠️ Profile ID does not match auth user ID'
    WHEN p.company_id IS NULL THEN '⚠️ Profile exists but has no company_id'
    ELSE '✅ Profile exists and IDs match'
  END AS status
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id OR p.email = au.email
WHERE au.email = 'lee@e-a-g.co'
LIMIT 1;

-- Step 4: Check all profiles for this email (in case there are duplicates)
SELECT 
  '=== ALL PROFILES FOR EMAIL ===' AS section,
  id,
  email,
  full_name,
  company_id,
  app_role,
  created_at
FROM public.profiles
WHERE email = 'lee@e-a-g.co'
ORDER BY created_at DESC;
