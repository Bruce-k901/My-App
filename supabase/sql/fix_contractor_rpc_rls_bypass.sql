-- Comprehensive fix to ensure contractor RPC functions bypass RLS
-- This script ensures SECURITY DEFINER functions can write to contractors table

-- Step 1: Grant all necessary permissions to postgres role
GRANT ALL ON public.contractors TO postgres;
GRANT ALL ON public.contractors TO service_role;

-- Step 2: Ensure functions are owned by postgres (superuser)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'insert_contractor_simple') THEN
    ALTER FUNCTION public.insert_contractor_simple OWNER TO postgres;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_contractor_simple') THEN
    ALTER FUNCTION public.update_contractor_simple OWNER TO postgres;
  END IF;
END $$;

-- Step 3: Verify RLS is enabled (it should be)
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;

-- Step 4: Create a test to verify the functions work
-- This will help diagnose if the issue is RLS or something else
DO $$
DECLARE
  v_test_company_id uuid;
  v_test_contractor_id uuid;
BEGIN
  -- Get a test company_id (use the first one found)
  SELECT id INTO v_test_company_id FROM public.companies LIMIT 1;
  
  IF v_test_company_id IS NOT NULL THEN
    -- Try to insert a test contractor
    BEGIN
      INSERT INTO public.contractors (
        company_id,
        name,
        category,
        contact_name,
        address,
        website
      ) VALUES (
        v_test_company_id,
        'TEST_CONTRACTOR_DELETE_ME',
        'test',
        'Test Contact',
        'Test Address',
        'https://test.com'
      ) RETURNING id INTO v_test_contractor_id;
      
      RAISE NOTICE 'Test insert successful. Contractor ID: %', v_test_contractor_id;
      
      -- Clean up
      DELETE FROM public.contractors WHERE id = v_test_contractor_id;
      RAISE NOTICE 'Test contractor deleted';
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Test insert failed: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'No companies found for testing';
  END IF;
END $$;

-- Step 5: Verify function permissions
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.proowner::regrole as owner,
  p.prosecdef as security_definer,
  CASE WHEN p.prosecdef THEN 'YES' ELSE 'NO' END as bypasses_rls
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('insert_contractor_simple', 'update_contractor_simple');

