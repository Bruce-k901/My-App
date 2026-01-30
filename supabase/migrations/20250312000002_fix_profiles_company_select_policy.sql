-- ============================================================================
-- Migration: Fix Profiles Company SELECT Policy
-- Description: Adds a SELECT policy that allows users to see all profiles in their company
--              Uses SECURITY DEFINER function to avoid recursion
-- ============================================================================
-- Note: This migration will be skipped if profiles table doesn't exist yet

DO $$
BEGIN
  -- Only proceed if profiles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    -- Drop existing company SELECT policy if it exists
    DROP POLICY IF EXISTS profiles_select_company ON public.profiles;

    -- Create a helper function to get user's company_id without recursion
    -- This function uses SECURITY DEFINER to bypass RLS when checking own profile
    CREATE OR REPLACE FUNCTION public.get_user_company_id_safe()
    RETURNS UUID
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    SET search_path = public
    AS $func$
    DECLARE
      v_company_id UUID;
    BEGIN
      -- SECURITY DEFINER bypasses RLS, so we can query profiles directly
      SELECT company_id INTO v_company_id
      FROM public.profiles
      WHERE id = auth.uid()
      LIMIT 1;
      
      RETURN v_company_id;
    END;
    $func$;

    -- Grant execute to authenticated users
    GRANT EXECUTE ON FUNCTION public.get_user_company_id_safe() TO authenticated;

    -- Create SELECT policy that allows users to see profiles in their company
    -- This uses the SECURITY DEFINER function to avoid recursion
    CREATE POLICY profiles_select_company
      ON public.profiles
      FOR SELECT
      USING (
        -- Users can always see their own profile
        id = auth.uid()
        OR
        -- Users can see profiles in their company (using function to avoid recursion)
        (
          company_id IS NOT NULL
          AND company_id = public.get_user_company_id_safe()
          AND public.get_user_company_id_safe() IS NOT NULL
        )
      );

    RAISE NOTICE 'Fixed profiles company SELECT policy';

  ELSE
    RAISE NOTICE '⚠️ profiles table does not exist yet - skipping company SELECT policy fix';
  END IF;
END $$;

