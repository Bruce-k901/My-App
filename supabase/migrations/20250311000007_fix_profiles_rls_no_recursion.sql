-- ============================================================================
-- Migration: Fix Profiles RLS - NO RECURSION APPROACH
-- Description: Completely removes recursion by using a simple policy that
--              only checks own profile, and a SECURITY DEFINER function for
--              company-wide queries that explicitly bypasses RLS
-- ============================================================================
-- Note: This migration will be skipped if profiles table doesn't exist yet

DO $$
BEGIN
  -- Only proceed if profiles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    -- Drop ALL existing policies on profiles
    DO $inner$ 
    DECLARE
        r RECORD;
    BEGIN
        FOR r IN (
            SELECT schemaname, tablename, policyname 
            FROM pg_policies 
            WHERE schemaname = 'public'
                AND tablename = 'profiles'
        ) LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        END LOOP;
    END $inner$;

    -- Drop the function if it exists (to allow changing return type)
    DROP FUNCTION IF EXISTS public.get_company_profiles(UUID);

    -- Create a SECURITY DEFINER function that explicitly bypasses RLS
    -- This function will be used by the application to get company profiles
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
      app_role TEXT,
      company_id UUID
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    SET search_path = public
    AS $func$
    DECLARE
      v_user_company_id UUID;
    BEGIN
      -- SECURITY DEFINER should bypass RLS, but we'll be explicit
      -- Check that user belongs to the same company
      -- Use table alias to avoid ambiguity with RETURNS TABLE columns
      SELECT p_check.company_id INTO v_user_company_id
      FROM public.profiles p_check
      WHERE p_check.id = auth.uid()
      LIMIT 1;
      
      -- Handle NULL company_id case - allow access if user has no company_id set
      -- This can happen during setup or if company_id was removed
      IF v_user_company_id IS NULL THEN
        -- User has no company_id - allow access but log a warning
        -- This allows them to see employees so they can be assigned to a company
        RAISE NOTICE 'User % has no company_id set - allowing access to company % for setup', auth.uid(), p_company_id;
        -- Continue execution - don't block
      ELSIF v_user_company_id != p_company_id THEN
        -- User belongs to different company - deny access
        RAISE EXCEPTION 'Access denied: user belongs to company %, requested company %', v_user_company_id, p_company_id;
      END IF;
      
      -- Return profiles for the company (RLS bypassed due to SECURITY DEFINER)
      -- Use table alias to avoid ambiguity with RETURNS TABLE columns
      -- Only select columns that actually exist in the profiles table
      -- Cast app_role to TEXT to ensure type compatibility
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
        p.app_role::TEXT,  -- Explicit cast to TEXT for compatibility
        p.company_id
      FROM public.profiles p
      WHERE p.company_id = p_company_id;
    END;
    $func$;

    -- Grant execute to authenticated users
    GRANT EXECUTE ON FUNCTION public.get_company_profiles(UUID) TO authenticated;

    -- Drop function if exists to recreate with correct signature
    DROP FUNCTION IF EXISTS public.get_own_profile();

    -- Create a helper function to get own profile (for AppContext)
    -- This bypasses RLS to avoid recursion issues
    -- Returns JSONB to avoid column mismatch issues
    CREATE FUNCTION public.get_own_profile()
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    SET search_path = public
    AS $func$
    DECLARE
      v_profile JSONB;
    BEGIN
      -- SECURITY DEFINER bypasses RLS
      -- Return the current user's profile as JSONB
      SELECT to_jsonb(p.*) INTO v_profile
      FROM public.profiles p
      WHERE p.id = auth.uid()
      LIMIT 1;
      
      RETURN COALESCE(v_profile, '{}'::jsonb);
    END;
    $func$;

    -- Grant execute to authenticated users
    GRANT EXECUTE ON FUNCTION public.get_own_profile() TO authenticated;

    -- Create a SIMPLE SELECT policy that ONLY allows users to see their own profile
    -- This avoids any recursion because it doesn't query profiles at all
    CREATE POLICY profiles_select_own
      ON public.profiles
      FOR SELECT
      USING (
        -- Users can ONLY see their own profile (no subqueries, no functions, no recursion)
        id = auth.uid()
      );

    -- For company-wide access, applications should use get_company_profiles() function
    -- But we'll also create a policy that allows seeing company profiles
    -- using a different approach - check company_id directly from auth context
    -- Actually, let's keep it simple - just own profile for now

    -- Create UPDATE policy (users can update own profile)
    CREATE POLICY profiles_update_own
      ON public.profiles
      FOR UPDATE
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());

    -- Create INSERT policy (users can insert their own profile)
    CREATE POLICY profiles_insert_own
      ON public.profiles
      FOR INSERT
      WITH CHECK (id = auth.uid());

    RAISE NOTICE 'Fixed profiles RLS with no-recursion approach';

  ELSE
    RAISE NOTICE '⚠️ profiles table does not exist yet - skipping RLS no-recursion fix';
  END IF;
END $$;

