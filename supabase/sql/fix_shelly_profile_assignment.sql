-- ============================================================================
-- Fix Shelly's Profile Assignment to Checkly Test Co
-- Ensures Shelly (Manager) is properly linked to the company
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FIND SHELLY AND CHECKLY TEST CO COMPANY
-- ============================================================================

DO $$
DECLARE
  v_shelly_id UUID;
  v_company_id UUID := 'fae1b377-859d-4ba6-bce2-d8aaf0044517'; -- Checkly Test Co ID from diagnostic
  v_shelly_email TEXT;
  v_shelly_current_company_id UUID;
  v_site_id UUID;
BEGIN
  -- Find Shelly by email (try common variations)
  SELECT id, email, company_id, site_id 
  INTO v_shelly_id, v_shelly_email, v_shelly_current_company_id, v_site_id
  FROM public.profiles
  WHERE email ILIKE '%shelly%'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_shelly_id IS NULL THEN
    RAISE NOTICE '❌ Shelly not found in profiles table';
    RAISE NOTICE 'Searching for users with "shelly" in email...';
    
    -- Show all users with "shelly" in email
    FOR v_shelly_email IN 
      SELECT email FROM public.profiles WHERE email ILIKE '%shelly%'
    LOOP
      RAISE NOTICE 'Found user: %', v_shelly_email;
    END LOOP;
    
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Found Shelly:';
  RAISE NOTICE '  - ID: %', v_shelly_id;
  RAISE NOTICE '  - Email: %', v_shelly_email;
  RAISE NOTICE '  - Current company_id: %', v_shelly_current_company_id;
  RAISE NOTICE '  - Site ID: %', v_site_id;
  
  -- Verify company exists
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = v_company_id) THEN
    RAISE NOTICE '❌ Company not found: %', v_company_id;
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Company found: Checkly Test Co';
  
  -- ============================================================================
  -- 2. CHECK IF SHELLY NEEDS COMPANY_ID UPDATE
  -- ============================================================================
  
  IF v_shelly_current_company_id IS NULL THEN
    RAISE NOTICE '⚠️ Shelly has no company_id - will update';
  ELSIF v_shelly_current_company_id != v_company_id THEN
    RAISE NOTICE '⚠️ Shelly has wrong company_id: % (should be %)', v_shelly_current_company_id, v_company_id;
  ELSE
    RAISE NOTICE '✅ Shelly already has correct company_id';
  END IF;
  
  -- ============================================================================
  -- 3. FIND EAST DULWICH SITE
  -- ============================================================================
  
  -- Try to find East Dulwich site if Shelly doesn't have site_id
  IF v_site_id IS NULL THEN
    SELECT id INTO v_site_id
    FROM public.sites
    WHERE company_id = v_company_id
      AND (name ILIKE '%east%dulwich%' OR name ILIKE '%dulwich%')
    LIMIT 1;
    
    IF v_site_id IS NOT NULL THEN
      RAISE NOTICE '✅ Found East Dulwich site: %', v_site_id;
    ELSE
      -- Get any site for the company
      SELECT id INTO v_site_id
      FROM public.sites
      WHERE company_id = v_company_id
      LIMIT 1;
      
      IF v_site_id IS NOT NULL THEN
        RAISE NOTICE '✅ Found site for company: %', v_site_id;
      ELSE
        RAISE NOTICE '⚠️ No sites found for company';
      END IF;
    END IF;
  END IF;
  
  -- ============================================================================
  -- 4. UPDATE SHELLY'S PROFILE
  -- ============================================================================
  
  IF v_shelly_current_company_id != v_company_id THEN
    UPDATE public.profiles
    SET 
      company_id = v_company_id,
      site_id = COALESCE(v_site_id, site_id) -- Only update site_id if we found one
    WHERE id = v_shelly_id;
    
    RAISE NOTICE '✅ Updated Shelly profile:';
    RAISE NOTICE '  - company_id: %', v_company_id;
    IF v_site_id IS NOT NULL THEN
      RAISE NOTICE '  - site_id: %', v_site_id;
    END IF;
  ELSE
    RAISE NOTICE '✅ No update needed - Shelly already has correct company_id';
  END IF;
  
  -- ============================================================================
  -- 5. VERIFY UPDATE
  -- ============================================================================
  
  SELECT company_id, site_id 
  INTO v_shelly_current_company_id, v_site_id
  FROM public.profiles
  WHERE id = v_shelly_id;
  
  IF v_shelly_current_company_id = v_company_id THEN
    RAISE NOTICE '✅ VERIFICATION SUCCESSFUL: Shelly is now linked to Checkly Test Co';
  ELSE
    RAISE NOTICE '❌ VERIFICATION FAILED: Update did not work';
  END IF;
  
END $$;

-- ============================================================================
-- 6. SHOW SHELLY'S UPDATED PROFILE
-- ============================================================================

SELECT 
  '=== SHELLY PROFILE (AFTER UPDATE) ===' as section,
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
    WHEN p.company_id = 'fae1b377-859d-4ba6-bce2-d8aaf0044517' THEN '✅ Linked to Checkly Test Co'
    ELSE '⚠️ Linked to different company'
  END as status
FROM public.profiles p
LEFT JOIN public.companies c ON c.id = p.company_id
LEFT JOIN public.sites s ON s.id = p.site_id
WHERE p.email ILIKE '%shelly%'
ORDER BY p.created_at DESC
LIMIT 1;

-- ============================================================================
-- 7. SHOW ALL USERS IN CHECKLY TEST CO (VERIFICATION)
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
    WHEN p.company_id = 'fae1b377-859d-4ba6-bce2-d8aaf0044517' THEN '✅ OK'
    ELSE '⚠️ Wrong company'
  END as status
FROM public.profiles p
LEFT JOIN public.sites s ON s.id = p.site_id
WHERE p.company_id = 'fae1b377-859d-4ba6-bce2-d8aaf0044517'
ORDER BY 
  CASE p.app_role
    WHEN 'Admin' THEN 1
    WHEN 'Manager' THEN 2
    WHEN 'Staff' THEN 3
    ELSE 4
  END,
  p.email;

COMMIT;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This script:
-- 1. ✅ Finds Shelly by email
-- 2. ✅ Verifies Checkly Test Co company exists
-- 3. ✅ Finds East Dulwich site (if exists)
-- 4. ✅ Updates Shelly's company_id to Checkly Test Co
-- 5. ✅ Updates site_id if site found
-- 6. ✅ Verifies the update worked
-- 7. ✅ Shows all users in Checkly Test Co
--
-- After running:
-- 1. Check the output to confirm Shelly's company_id was updated
-- 2. Verify Shelly appears in "ALL USERS IN CHECKLY TEST CO" list
-- 3. Have Shelly log in again - business page should now work
-- ============================================================================










