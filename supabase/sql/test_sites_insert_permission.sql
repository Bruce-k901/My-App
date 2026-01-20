-- ============================================================================
-- TEST SITES INSERT PERMISSION
-- ============================================================================
-- Run this as the user experiencing the issue to verify everything works
-- ============================================================================

-- Step 1: Test helper functions
SELECT 
  '=== HELPER FUNCTION TESTS ===' AS section,
  auth.uid() AS current_user_id,
  public.get_user_company_id() AS user_company_id,
  public.is_user_owner_or_admin() AS is_owner_or_admin;

-- Step 2: Check user profile
SELECT 
  '=== USER PROFILE ===' AS section,
  id,
  email,
  full_name,
  company_id,
  app_role,
  LOWER(app_role::text) AS app_role_lower
FROM public.profiles
WHERE id = auth.uid();

-- Step 3: Test if INSERT would pass the policy check
-- This simulates what the RLS policy checks
DO $$
DECLARE
  v_user_company_id UUID;
  v_is_owner_or_admin BOOLEAN;
  v_test_company_id UUID;
  v_policy_check_passes BOOLEAN := false;
BEGIN
  -- Get values from helper functions
  v_user_company_id := public.get_user_company_id();
  v_is_owner_or_admin := public.is_user_owner_or_admin();
  
  -- Simulate the company_id that would be in the INSERT
  -- Use the user's actual company_id
  v_test_company_id := v_user_company_id;
  
  RAISE NOTICE '=== POLICY CHECK SIMULATION ===';
  RAISE NOTICE 'User ID: %', auth.uid();
  RAISE NOTICE 'User Company ID: %', v_user_company_id;
  RAISE NOTICE 'Is Owner/Admin: %', v_is_owner_or_admin;
  RAISE NOTICE 'Test Company ID (for INSERT): %', v_test_company_id;
  
  -- Check each condition in the policy
  IF v_user_company_id IS NULL THEN
    RAISE NOTICE '❌ FAIL: get_user_company_id() IS NULL';
    RETURN;
  ELSE
    RAISE NOTICE '✅ PASS: get_user_company_id() IS NOT NULL';
  END IF;
  
  IF v_user_company_id != v_test_company_id THEN
    RAISE NOTICE '❌ FAIL: get_user_company_id() != sites.company_id';
    RAISE NOTICE '   Expected: %, Got: %', v_test_company_id, v_user_company_id;
    RETURN;
  ELSE
    RAISE NOTICE '✅ PASS: get_user_company_id() = sites.company_id';
  END IF;
  
  IF v_is_owner_or_admin != true THEN
    RAISE NOTICE '❌ FAIL: is_user_owner_or_admin() != true';
    RAISE NOTICE '   Current value: %', v_is_owner_or_admin;
    RETURN;
  ELSE
    RAISE NOTICE '✅ PASS: is_user_owner_or_admin() = true';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅✅✅ ALL CHECKS PASSED - INSERT SHOULD WORK ✅✅✅';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ ERROR: %', SQLERRM;
END $$;

-- Step 4: Show what would be inserted
SELECT 
  '=== TEST INSERT DATA ===' AS section,
  public.get_user_company_id() AS company_id,
  'TEST SITE' AS name,
  '123 Test Street' AS address_line1,
  'TEST123' AS postcode,
  'active' AS status;

-- Step 5: Manual test INSERT (uncomment to test, then DELETE the test row)
-- BEGIN;
--   INSERT INTO public.sites (
--     company_id,
--     name,
--     address_line1,
--     postcode,
--     status
--   ) VALUES (
--     public.get_user_company_id(),
--     'TEST SITE - DELETE ME',
--     '123 Test Street',
--     'TEST123',
--     'active'
--   );
--   -- If this succeeds, DELETE the test row:
--   -- DELETE FROM sites WHERE name = 'TEST SITE - DELETE ME';
--   -- Then ROLLBACK; or COMMIT;
-- ROLLBACK;










