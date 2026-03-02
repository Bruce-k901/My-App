-- ============================================================================
-- Diagnostic Script for Shelly's Permissions Issue
-- Check why Shelly (Manager) sees empty business page
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CHECK SHELLY'S PROFILE
-- ============================================================================

SELECT 
  '=== SHELLY PROFILE ===' as section,
  p.id,
  p.email,
  p.full_name,
  p.app_role,
  p.company_id,
  p.site_id,
  c.name as company_name,
  s.name as site_name,
  CASE 
    WHEN p.company_id IS NULL THEN '❌ Missing company_id'
    WHEN p.company_id IS NOT NULL AND c.id IS NULL THEN '❌ Invalid company_id'
    ELSE '✅ OK'
  END as company_status
FROM public.profiles p
LEFT JOIN public.companies c ON c.id = p.company_id
LEFT JOIN public.sites s ON s.id = p.site_id
WHERE p.email ILIKE '%shelly%'
ORDER BY p.created_at DESC;

-- ============================================================================
-- 2. CHECK CHECKLY TEST CO COMPANY
-- ============================================================================

SELECT 
  '=== CHECKLY TEST CO COMPANY ===' as section,
  c.id,
  c.name,
  c.legal_name,
  c.created_by,
  c.user_id,
  (SELECT COUNT(*) FROM public.profiles WHERE company_id = c.id) as user_count
FROM public.companies c
WHERE c.name ILIKE '%checkly%test%' OR c.name ILIKE '%test%co%'
ORDER BY c.created_at DESC;

-- ============================================================================
-- 3. CHECK ALL USERS IN CHECKLY TEST CO
-- ============================================================================

SELECT 
  '=== ALL USERS IN CHECKLY TEST CO ===' as section,
  p.id,
  p.email,
  p.full_name,
  p.app_role,
  p.company_id,
  p.site_id,
  s.name as site_name,
  CASE 
    WHEN p.company_id IS NULL THEN '❌ Missing company_id'
    WHEN p.company_id IS NOT NULL AND c.id IS NULL THEN '❌ Invalid company_id'
    ELSE '✅ OK'
  END as status
FROM public.profiles p
LEFT JOIN public.companies c ON c.id = p.company_id
LEFT JOIN public.sites s ON s.id = p.site_id
WHERE c.name ILIKE '%checkly%test%' OR c.name ILIKE '%test%co%'
ORDER BY 
  CASE p.app_role
    WHEN 'Admin' THEN 1
    WHEN 'Manager' THEN 2
    WHEN 'Staff' THEN 3
    ELSE 4
  END,
  p.email;

-- ============================================================================
-- 4. CHECK COMPANY RLS POLICIES
-- ============================================================================

SELECT 
  '=== COMPANIES TABLE RLS POLICIES ===' as section,
  policyname,
  cmd,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'companies'
ORDER BY cmd, policyname;

-- ============================================================================
-- 5. CHECK IF SHELLY CAN ACCESS COMPANY VIA RLS
-- ============================================================================

-- Simulate RLS check for Shelly
DO $$
DECLARE
  v_shelly_id UUID;
  v_company_id UUID;
  v_can_access BOOLEAN;
BEGIN
  -- Get Shelly's user ID
  SELECT id INTO v_shelly_id
  FROM public.profiles
  WHERE email ILIKE '%shelly%'
  LIMIT 1;
  
  IF v_shelly_id IS NULL THEN
    RAISE NOTICE '❌ Shelly not found';
    RETURN;
  END IF;
  
  -- Get company ID
  SELECT company_id INTO v_company_id
  FROM public.profiles
  WHERE id = v_shelly_id;
  
  IF v_company_id IS NULL THEN
    RAISE NOTICE '❌ Shelly has no company_id';
    RETURN;
  END IF;
  
  -- Check if company exists
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = v_company_id) THEN
    RAISE NOTICE '❌ Company does not exist: %', v_company_id;
    RETURN;
  END IF;
  
  -- Simulate RLS policy check (companies_select_own_or_profile)
  SELECT EXISTS (
    SELECT 1 FROM public.companies c
    WHERE c.id = v_company_id
      AND (
        c.user_id = v_shelly_id
        OR c.created_by = v_shelly_id
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = v_shelly_id
            AND p.company_id = c.id
            AND p.company_id IS NOT NULL
        )
      )
  ) INTO v_can_access;
  
  IF v_can_access THEN
    RAISE NOTICE '✅ Shelly CAN access company via RLS';
  ELSE
    RAISE NOTICE '❌ Shelly CANNOT access company via RLS';
  END IF;
  
  -- Show company data
  RAISE NOTICE 'Company ID: %, Company Name: %', 
    v_company_id,
    (SELECT name FROM public.companies WHERE id = v_company_id);
END $$;

-- ============================================================================
-- 6. CHECK COMPANY DATA EXISTS
-- ============================================================================

SELECT 
  '=== COMPANY DATA CHECK ===' as section,
  c.id,
  c.name,
  c.legal_name,
  c.industry,
  c.vat_number,
  c.company_number,
  c.phone,
  c.website,
  c.country,
  c.contact_email,
  c.address_line1,
  c.address_line2,
  c.city,
  c.postcode,
  CASE 
    WHEN c.name IS NULL OR c.name = '' THEN '❌ Empty name'
    WHEN c.legal_name IS NULL AND c.vat_number IS NULL AND c.company_number IS NULL THEN '⚠️ Minimal data'
    ELSE '✅ Has data'
  END as data_status
FROM public.companies c
WHERE c.name ILIKE '%checkly%test%' OR c.name ILIKE '%test%co%'
ORDER BY c.created_at DESC;

COMMIT;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This script checks:
-- 1. ✅ Shelly's profile and company assignment
-- 2. ✅ Checkly Test Co company details
-- 3. ✅ All users in the company
-- 4. ✅ RLS policies on companies table
-- 5. ✅ Simulated RLS access check
-- 6. ✅ Company data completeness
--
-- Common issues to look for:
-- - Shelly's company_id is NULL or incorrect
-- - Company data is empty (all fields NULL)
-- - RLS policy is blocking access
-- - Profile and company mismatch
-- ============================================================================










