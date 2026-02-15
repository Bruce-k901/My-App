-- ============================================================================
-- Migration: Fix Profiles RLS Select Policy
-- Description: Ensures the SELECT policy works correctly for all users
-- ============================================================================
-- Note: This migration will be skipped if profiles table doesn't exist yet

DO $$
BEGIN
  -- Only proceed if profiles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    -- Drop and recreate the SELECT policy to ensure it works correctly
    DROP POLICY IF EXISTS profiles_select_company ON public.profiles;

    -- Create a more permissive SELECT policy that allows users to see all profiles in their company
    -- This uses the security definer function to avoid recursion
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
          AND company_id = public.get_user_company_id()
          AND public.get_user_company_id() IS NOT NULL
        )
        OR
        -- Fallback: if user has a company_id in their profile, they can see others in same company
        -- This handles edge cases where the function might fail
        (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.company_id IS NOT NULL
            AND p.company_id = profiles.company_id
          )
        )
      );

    RAISE NOTICE 'Fixed profiles RLS SELECT policy';

  ELSE
    RAISE NOTICE '⚠️ profiles table does not exist yet - skipping RLS policy fix';
  END IF;
END $$;

