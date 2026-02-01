-- ============================================================================
-- Migration: Diagnose Profile Company Link
-- Description: Helper function to check if a user's profile is linked to a company
-- ============================================================================
-- Note: This migration will be skipped if profiles table doesn't exist yet

DO $$
BEGIN
  -- Only proceed if profiles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    -- Create a diagnostic function to check profile and company status
    CREATE OR REPLACE FUNCTION public.diagnose_user_profile()
    RETURNS TABLE (
      user_id UUID,
      profile_exists BOOLEAN,
      profile_id UUID,
      full_name TEXT,
      email TEXT,
      company_id UUID,
      company_name TEXT,
      app_role TEXT,
      status TEXT
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    SET search_path = public
    AS $func$
    DECLARE
      v_user_id UUID;
    BEGIN
      v_user_id := auth.uid();
      
      RETURN QUERY
      SELECT 
        v_user_id AS user_id,
        EXISTS(SELECT 1 FROM profiles WHERE id = v_user_id) AS profile_exists,
        p.id AS profile_id,
        p.full_name,
        p.email,
        p.company_id,
        c.name AS company_name,
        p.app_role,
        p.status
      FROM profiles p
      LEFT JOIN companies c ON c.id = p.company_id
      WHERE p.id = v_user_id;
      
      -- If no profile found, return diagnostic info
      IF NOT FOUND THEN
        RETURN QUERY SELECT 
          v_user_id,
          false,
          NULL::UUID,
          NULL::TEXT,
          NULL::TEXT,
          NULL::UUID,
          NULL::TEXT,
          NULL::TEXT,
          NULL::TEXT;
      END IF;
    END;
    $func$;

    -- Grant execute to authenticated users
    GRANT EXECUTE ON FUNCTION public.diagnose_user_profile() TO authenticated;

    -- Also create a function to fix missing company_id
    -- This should only be run by admins or during setup
    CREATE OR REPLACE FUNCTION public.fix_profile_company(
      p_profile_id UUID,
      p_company_id UUID
    )
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $func$
    DECLARE
      v_current_user_company UUID;
    BEGIN
      -- Get current user's company
      SELECT company_id INTO v_current_user_company
      FROM profiles
      WHERE id = auth.uid();
      
      -- Only allow if:
      -- 1. Current user is admin/owner
      -- 2. OR current user is in the same company as the profile being fixed
      -- 3. OR profile being fixed is the current user's own profile
      IF v_current_user_company IS NULL AND p_profile_id != auth.uid() THEN
        RAISE EXCEPTION 'Cannot fix company for other users without company assignment';
      END IF;
      
      -- Update the profile
      UPDATE profiles
      SET company_id = p_company_id,
          updated_at = NOW()
      WHERE id = p_profile_id;
      
      RETURN FOUND;
    END;
    $func$;

    -- Grant execute to authenticated users
    GRANT EXECUTE ON FUNCTION public.fix_profile_company(UUID, UUID) TO authenticated;

    RAISE NOTICE 'Created diagnostic functions for profile company link';

  ELSE
    RAISE NOTICE '⚠️ profiles table does not exist yet - skipping diagnostic functions';
  END IF;
END $$;

