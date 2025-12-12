-- ============================================================================
-- REMOVE SHELLY FROM CHECKLY TEST CO
-- ============================================================================
-- This script removes Shelly Roderick from Checkly Test Co by clearing
-- her company_id and site_id in the profiles table.
-- After running this, you can re-add her to the company.
-- ============================================================================

DO $$
DECLARE
  v_shelly_id UUID;
  v_shelly_email TEXT := 'lee@e-a-g.co';
  v_shelly_name TEXT := 'Shelly Roderick';
  v_company_id UUID := 'fae1b377-859d-4ba6-bce2-d8aaf0044517';
  v_company_name TEXT := 'Checkly Test Co';
  v_before_company_id UUID;
  v_before_site_id UUID;
BEGIN
  RAISE NOTICE '=== REMOVING SHELLY FROM CHECKLY TEST CO ===';
  RAISE NOTICE '';

  -- Find Shelly's user ID
  SELECT id INTO v_shelly_id
  FROM public.profiles
  WHERE email = v_shelly_email
     OR full_name = v_shelly_name
  LIMIT 1;

  IF v_shelly_id IS NULL THEN
    RAISE EXCEPTION '❌ Shelly not found. Email: %, Name: %', v_shelly_email, v_shelly_name;
  END IF;

  RAISE NOTICE '✅ Found Shelly:';
  RAISE NOTICE '   User ID: %', v_shelly_id;
  RAISE NOTICE '   Email: %', v_shelly_email;
  RAISE NOTICE '';

  -- Get current values before removal
  SELECT company_id, site_id
  INTO v_before_company_id, v_before_site_id
  FROM public.profiles
  WHERE id = v_shelly_id;

  RAISE NOTICE '📋 Current Profile State:';
  RAISE NOTICE '   Company ID: %', COALESCE(v_before_company_id::TEXT, 'NULL');
  RAISE NOTICE '   Site ID: %', COALESCE(v_before_site_id::TEXT, 'NULL');
  RAISE NOTICE '';

  -- Verify she's currently in Checkly Test Co
  IF v_before_company_id IS NOT NULL AND v_before_company_id != v_company_id THEN
    RAISE WARNING '⚠️ Shelly is currently in a different company: %', v_before_company_id;
    RAISE WARNING '   Expected: % (%)', v_company_id, v_company_name;
    RAISE WARNING '   Proceeding with removal anyway...';
    RAISE NOTICE '';
  ELSIF v_before_company_id IS NULL THEN
    RAISE NOTICE 'ℹ️ Shelly has no company_id assigned (already removed?)';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '✅ Confirmed: Shelly is in % (%)', v_company_name, v_company_id;
    RAISE NOTICE '';
  END IF;

  -- Remove Shelly from company (set company_id and site_id to NULL)
  UPDATE public.profiles
  SET
    company_id = NULL,
    site_id = NULL,
    updated_at = NOW()
  WHERE id = v_shelly_id;

  IF FOUND THEN
    RAISE NOTICE '✅ Successfully removed Shelly from company';
    RAISE NOTICE '   - company_id set to NULL';
    RAISE NOTICE '   - site_id set to NULL';
    RAISE NOTICE '';
  ELSE
    RAISE EXCEPTION '❌ Failed to update Shelly profile';
  END IF;

  -- Verify removal
  SELECT company_id, site_id
  INTO v_before_company_id, v_before_site_id
  FROM public.profiles
  WHERE id = v_shelly_id;

  RAISE NOTICE '📋 Updated Profile State:';
  RAISE NOTICE '   Company ID: %', COALESCE(v_before_company_id::TEXT, 'NULL');
  RAISE NOTICE '   Site ID: %', COALESCE(v_before_site_id::TEXT, 'NULL');
  RAISE NOTICE '';

  IF v_before_company_id IS NULL AND v_before_site_id IS NULL THEN
    RAISE NOTICE '✅ Verification: Shelly successfully removed from company';
  ELSE
    RAISE WARNING '⚠️ Verification: Some values still present';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=== REMOVAL COMPLETE ===';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Re-add Shelly to Checkly Test Co using the admin panel';
  RAISE NOTICE '2. Or run fix_shelly_profile_assignment.sql to re-assign her';

END $$;

-- ============================================================================
-- VERIFICATION QUERY: Show Shelly's current state
-- ============================================================================
SELECT 
  '=== SHELLY PROFILE AFTER REMOVAL ===' AS section,
  p.id,
  p.email,
  p.full_name,
  p.app_role,
  p.company_id,
  p.site_id,
  CASE 
    WHEN p.company_id IS NULL THEN '✅ Removed from company'
    ELSE '⚠️ Still has company_id: ' || p.company_id::TEXT
  END AS status
FROM public.profiles p
WHERE p.email = 'lee@e-a-g.co'
   OR p.full_name = 'Shelly Roderick';

-- ============================================================================
-- VERIFICATION QUERY: Show all users in Checkly Test Co (should not include Shelly)
-- ============================================================================
SELECT 
  '=== ALL USERS IN CHECKLY TEST CO (AFTER REMOVAL) ===' AS section,
  p.id,
  p.email,
  p.full_name,
  p.app_role,
  p.company_id,
  p.site_id,
  CASE 
    WHEN p.company_id = 'fae1b377-859d-4ba6-bce2-d8aaf0044517' THEN '✅ In company'
    WHEN p.company_id IS NULL THEN '❌ No company'
    ELSE '⚠️ Different company: ' || p.company_id::TEXT
  END AS status
FROM public.profiles p
WHERE p.company_id = 'fae1b377-859d-4ba6-bce2-d8aaf0044517'
ORDER BY p.app_role, p.full_name;

