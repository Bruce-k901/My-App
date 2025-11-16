-- ============================================================================
-- Fix User Profile Company Assignment
-- Use this to check and fix your profile's company_id
-- ============================================================================

-- 1. Check all profiles without company_id
SELECT 
  '=== PROFILES WITHOUT COMPANY_ID ===' as section,
  id,
  email,
  full_name,
  company_id,
  app_role
FROM public.profiles
WHERE company_id IS NULL
ORDER BY created_at DESC
LIMIT 20;

-- 2. Check your specific profile (replace YOUR_EMAIL with your actual email)
-- SELECT 
--   '=== YOUR PROFILE ===' as section,
--   id,
--   email,
--   full_name,
--   company_id,
--   site_id,
--   app_role
-- FROM public.profiles
-- WHERE email = 'YOUR_EMAIL@example.com';

-- 3. If you need to set company_id for your profile, uncomment and run:
-- UPDATE public.profiles
-- SET company_id = 'YOUR_COMPANY_ID_HERE'
-- WHERE id = auth.uid()  -- or WHERE email = 'your-email@example.com'
-- RETURNING id, email, company_id;

