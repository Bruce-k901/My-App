-- ============================================================================
-- TEST THE FUNCTION DIRECTLY
-- Run this in Supabase SQL Editor to see the exact error
-- ============================================================================

-- Step 1: Check if function exists and its signature
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_company_profiles';

-- Step 2: Get your company_id
SELECT 
  id,
  full_name,
  email,
  company_id
FROM profiles
WHERE id = auth.uid();

-- Step 3: Test the function with your company_id
-- Replace 'YOUR_COMPANY_ID' with the UUID from Step 2
DO $$
DECLARE
  v_company_id UUID;
  v_result RECORD;
BEGIN
  -- Get your company_id
  SELECT company_id INTO v_company_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RAISE NOTICE 'Testing with company_id: %', v_company_id;
  
  -- Try to call the function
  BEGIN
    FOR v_result IN 
      SELECT * FROM get_company_profiles(v_company_id)
    LOOP
      RAISE NOTICE 'Found employee: % - %', v_result.profile_id, v_result.full_name;
    END LOOP;
    
    RAISE NOTICE 'Function executed successfully';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: %', SQLERRM;
    RAISE NOTICE 'ERROR DETAIL: %', SQLSTATE;
  END;
END $$;

-- Step 4: Try calling it directly (this will show the actual error)
SELECT * FROM get_company_profiles(
  (SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1)
);

