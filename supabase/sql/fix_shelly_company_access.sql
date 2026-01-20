-- ============================================================================
-- Fix Shelly's Company Access Issue
-- Ensures Shelly (Manager) can access Checkly Test Co company data
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. FIND SHELLY AND CHECKLY TEST CO
-- ============================================================================

DO $$
DECLARE
  v_shelly_id UUID;
  v_mike_id UUID;
  v_company_id UUID;
BEGIN
  -- Find Shelly
  SELECT id INTO v_shelly_id
  FROM public.profiles
  WHERE email ILIKE '%shelly%'
  LIMIT 1;
  
  -- Find Mike (Admin)
  SELECT id INTO v_mike_id
  FROM public.profiles
  WHERE email ILIKE '%mike%' AND app_role = 'Admin'
  LIMIT 1;
  
  -- Find Checkly Test Co company
  SELECT id INTO v_company_id
  FROM public.companies
  WHERE name ILIKE '%checkly%test%' OR name ILIKE '%test%co%'
  LIMIT 1;
  
  IF v_shelly_id IS NULL THEN
    RAISE NOTICE '❌ Shelly not found';
  ELSE
    RAISE NOTICE '✅ Found Shelly: %', v_shelly_id;
  END IF;
  
  IF v_company_id IS NULL THEN
    RAISE NOTICE '❌ Checkly Test Co company not found';
  ELSE
    RAISE NOTICE '✅ Found company: %', v_company_id;
  END IF;
  
  -- ============================================================================
  -- 2. FIX SHELLY'S COMPANY_ID IF MISSING
  -- ============================================================================
  
  IF v_shelly_id IS NOT NULL AND v_company_id IS NOT NULL THEN
    -- Check if Shelly has company_id set
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = v_shelly_id 
        AND company_id = v_company_id
    ) THEN
      -- Update Shelly's company_id
      UPDATE public.profiles
      SET company_id = v_company_id
      WHERE id = v_shelly_id;
      
      RAISE NOTICE '✅ Updated Shelly company_id to: %', v_company_id;
    ELSE
      RAISE NOTICE '✅ Shelly already has correct company_id';
    END IF;
  END IF;
  
  -- ============================================================================
  -- 3. VERIFY COMPANY HAS DATA
  -- ============================================================================
  
  IF v_company_id IS NOT NULL THEN
    -- Check if company has any data
    IF EXISTS (
      SELECT 1 FROM public.companies
      WHERE id = v_company_id
        AND (
          name IS NOT NULL AND name != ''
          OR legal_name IS NOT NULL AND legal_name != ''
          OR vat_number IS NOT NULL AND vat_number != ''
          OR company_number IS NOT NULL AND company_number != ''
        )
    ) THEN
      RAISE NOTICE '✅ Company has data';
    ELSE
      RAISE NOTICE '⚠️ Company exists but may have empty fields';
      
      -- If Mike's company has data, we can see what fields are populated
      IF v_mike_id IS NOT NULL THEN
        SELECT company_id INTO v_company_id
        FROM public.profiles
        WHERE id = v_mike_id;
        
        IF v_company_id IS NOT NULL THEN
          RAISE NOTICE 'Mike company_id: %', v_company_id;
        END IF;
      END IF;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 4. VERIFY SHELLY'S ACCESS
-- ============================================================================

SELECT 
  '=== SHELLY ACCESS VERIFICATION ===' as section,
  p.id as shelly_id,
  p.email as shelly_email,
  p.app_role as shelly_role,
  p.company_id as shelly_company_id,
  c.id as company_id,
  c.name as company_name,
  CASE 
    WHEN p.company_id IS NULL THEN '❌ Missing company_id'
    WHEN p.company_id IS NOT NULL AND c.id IS NULL THEN '❌ Invalid company_id'
    WHEN p.company_id = c.id THEN '✅ Company assigned correctly'
    ELSE '⚠️ Company mismatch'
  END as access_status
FROM public.profiles p
LEFT JOIN public.companies c ON c.id = p.company_id
WHERE p.email ILIKE '%shelly%'
LIMIT 1;

-- ============================================================================
-- 5. CHECK COMPANY DATA COMPLETENESS
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
  c.city,
  c.postcode,
  CASE 
    WHEN c.name IS NULL OR c.name = '' THEN '❌ Empty name'
    WHEN c.legal_name IS NULL AND c.vat_number IS NULL AND c.company_number IS NULL 
         AND c.phone IS NULL AND c.website IS NULL THEN '⚠️ Minimal data'
    ELSE '✅ Has data'
  END as data_status
FROM public.companies c
WHERE c.name ILIKE '%checkly%test%' OR c.name ILIKE '%test%co%'
ORDER BY c.created_at DESC
LIMIT 1;

COMMIT;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This script:
-- 1. ✅ Finds Shelly and Checkly Test Co company
-- 2. ✅ Fixes Shelly's company_id if missing
-- 3. ✅ Verifies company has data
-- 4. ✅ Verifies Shelly's access
-- 5. ✅ Checks company data completeness
--
-- After running:
-- 1. Check the output to see if Shelly's company_id was fixed
-- 2. Check if company has data
-- 3. If company is empty, you may need to populate it via the UI (as Admin)
-- 4. Test Shelly's login again
-- ============================================================================










