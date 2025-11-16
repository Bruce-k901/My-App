-- ============================================================================
-- Fix Your Profile Company Assignment
-- Replace YOUR_USER_ID with: 8066c4f2-fbff-4255-be96-71acf151473d
-- ============================================================================

-- 1. Check your current profile
SELECT 
  '=== YOUR CURRENT PROFILE ===' as section,
  id,
  email,
  full_name,
  company_id,
  site_id,
  app_role
FROM public.profiles
WHERE id = '8066c4f2-fbff-4255-be96-71acf151473d';

-- 2. Check what companies exist
SELECT 
  '=== AVAILABLE COMPANIES ===' as section,
  id as company_id,
  name as company_name,
  created_at
FROM public.companies
ORDER BY created_at DESC
LIMIT 10;

-- 3. Check if you have a company from your user record
SELECT 
  '=== YOUR COMPANY FROM USER RECORD ===' as section,
  c.id as company_id,
  c.name as company_name
FROM public.companies c
WHERE c.user_id = '8066c4f2-fbff-4255-be96-71acf151473d'
LIMIT 1;

-- 4. Try to auto-find your company from companies table
SELECT 
  '=== AUTO-FIND COMPANY ===' as section,
  c.id as suggested_company_id,
  c.name as company_name,
  'Run the UPDATE below with this company_id' as instruction
FROM public.companies c
WHERE c.user_id = '8066c4f2-fbff-4255-be96-71acf151473d'
LIMIT 1;

-- 5. UPDATE YOUR PROFILE - Run this after checking section 4 above
-- This will set your company_id to the company where you are the owner
UPDATE public.profiles
SET company_id = (
  SELECT id FROM public.companies 
  WHERE user_id = '8066c4f2-fbff-4255-be96-71acf151473d' 
  LIMIT 1
)
WHERE id = '8066c4f2-fbff-4255-be96-71acf151473d'
  AND company_id IS NULL
RETURNING id, email, company_id;

-- 6. Verify the update
SELECT 
  '=== VERIFICATION ===' as section,
  id,
  email,
  company_id,
  CASE 
    WHEN company_id IS NOT NULL THEN '✓ Profile now has company_id'
    ELSE '✗ Still missing company_id'
  END as status
FROM public.profiles
WHERE id = '8066c4f2-fbff-4255-be96-71acf151473d';

