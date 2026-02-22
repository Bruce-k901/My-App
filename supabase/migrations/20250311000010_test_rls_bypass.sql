-- ============================================================================
-- Test RLS Bypass for get_company_profiles function
-- This migration tests and fixes any RLS issues preventing the function from working
-- ============================================================================
-- Note: This migration will be skipped if profiles table doesn't exist yet

DO $$
BEGIN
  -- Only proceed if profiles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    -- First, let's create a test function that explicitly bypasses RLS
    -- This will help us verify that SECURITY DEFINER is working

    -- Test function to see what the function can actually read
    CREATE OR REPLACE FUNCTION public.test_rls_bypass()
    RETURNS TABLE (
      test_user_id UUID,
      test_company_id UUID,
      can_read_own_profile BOOLEAN,
      can_read_company_profiles INTEGER,
      total_profiles INTEGER
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    DECLARE
      v_user_id UUID;
      v_company_id UUID;
      v_can_read_own BOOLEAN;
      v_company_count INTEGER;
      v_total_count INTEGER;
    BEGIN
      v_user_id := auth.uid();
      
      -- Try to read own profile
      SELECT company_id INTO v_company_id
      FROM public.profiles
      WHERE id = v_user_id
      LIMIT 1;
      
      v_can_read_own := (v_company_id IS NOT NULL);
      
      -- Count profiles in company (if company_id exists)
      IF v_company_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_company_count
        FROM public.profiles
        WHERE company_id = v_company_id;
      ELSE
        v_company_count := 0;
      END IF;
      
      -- Count total profiles (should work with SECURITY DEFINER)
      SELECT COUNT(*) INTO v_total_count
      FROM public.profiles;
      
      RETURN QUERY SELECT 
        v_user_id,
        v_company_id,
        v_can_read_own,
        v_company_count,
        v_total_count;
    END;
    $func$;

    GRANT EXECUTE ON FUNCTION public.test_rls_bypass() TO authenticated;

    -- Now let's verify and potentially fix the get_company_profiles function
    -- Make sure it's using SECURITY DEFINER correctly

    -- Drop and recreate with explicit RLS bypass
    DROP FUNCTION IF EXISTS public.get_company_profiles(UUID);

    CREATE FUNCTION public.get_company_profiles(p_company_id UUID)
    RETURNS TABLE (
      profile_id UUID,
      full_name TEXT,
      email TEXT,
      phone_number TEXT,
      avatar_url TEXT,
      position_title TEXT,
      department TEXT,
      home_site UUID,
      status TEXT,
      start_date DATE,
      app_role TEXT,  -- Use TEXT and cast enum to TEXT in SELECT
      company_id UUID,
      contract_type TEXT,
      reports_to UUID,
      auth_user_id UUID
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    SET search_path = public
    AS $func$
    DECLARE
      v_user_company_id UUID;
      v_user_id UUID;
    BEGIN
      -- Get current user ID
      v_user_id := auth.uid();
      
      -- SECURITY DEFINER should bypass RLS, but let's be explicit
      -- Use a direct query that should work even with RLS
      -- We'll use a subquery to ensure we can read the profile
      SELECT p_check.company_id INTO v_user_company_id
      FROM public.profiles p_check
      WHERE p_check.id = v_user_id
      LIMIT 1;
      
      -- Handle NULL company_id cases - return empty result instead of error
      IF p_company_id IS NULL THEN
        -- Return empty result set - don't raise exception
        RAISE NOTICE 'get_company_profiles called with NULL company_id - returning empty result';
        RETURN;
      END IF;
      
      -- If user has no company_id, allow access (for setup/admin purposes)
      IF v_user_company_id IS NULL THEN
        -- User has no company_id - allow access but only return profiles for requested company
        RAISE NOTICE 'User % has no company_id - allowing access to company %', v_user_id, p_company_id;
      ELSIF v_user_company_id != p_company_id THEN
        -- User belongs to different company - deny access
        RAISE EXCEPTION 'Access denied: user belongs to company %, requested company %', v_user_company_id, p_company_id;
      END IF;
      
      -- Return profiles for the company (RLS bypassed due to SECURITY DEFINER)
      -- Explicitly set search_path to ensure we're querying the right table
      -- Cast app_role enum to TEXT to match return type
      RETURN QUERY
      SELECT 
        p.id AS profile_id,
        p.full_name,
        p.email,
        p.phone_number,
        p.avatar_url,
        p.position_title,
        p.department,
        p.home_site,
        p.status,
        p.start_date,
        p.app_role::TEXT,  -- CRITICAL: Cast enum to TEXT
        p.company_id,
        p.contract_type,
        p.reports_to,
        p.auth_user_id
      FROM public.profiles p
      WHERE p.company_id = p_company_id;
    END;
    $func$;

    -- Grant execute to authenticated users
    GRANT EXECUTE ON FUNCTION public.get_company_profiles(UUID) TO authenticated;

    -- Verify the function is SECURITY DEFINER
    DO $inner$
    DECLARE
      v_is_security_definer BOOLEAN;
    BEGIN
      SELECT prosecdef INTO v_is_security_definer
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'get_company_profiles'
        AND pg_get_function_arguments(p.oid) = 'p_company_id uuid';
      
      IF v_is_security_definer THEN
        RAISE NOTICE '✅ Function is SECURITY DEFINER - RLS should be bypassed';
      ELSE
        RAISE WARNING '❌ Function is NOT SECURITY DEFINER - RLS will apply';
      END IF;
    END $inner$;

    RAISE NOTICE 'Created test RLS bypass functions';

  ELSE
    RAISE NOTICE '⚠️ profiles table does not exist yet - skipping RLS bypass test';
  END IF;
END $$;

