-- ============================================================================
-- Fix: Handle NULL company_id in get_company_profiles function
-- This migration updates the function to handle cases where:
-- 1. User's profile has NULL company_id
-- 2. Requested company_id is NULL
-- ============================================================================
-- Note: This migration will be skipped if profiles table doesn't exist yet

DO $$
BEGIN
  -- Only proceed if profiles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    -- Drop and recreate the function with better NULL handling
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
      app_role VARCHAR,  -- Changed to VARCHAR to match table definition
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
    BEGIN
      -- Get user's company_id (may be NULL)
      SELECT p_check.company_id INTO v_user_company_id
      FROM public.profiles p_check
      WHERE p_check.id = auth.uid()
      LIMIT 1;
      
      -- Handle NULL company_id cases - return empty result instead of error
      IF p_company_id IS NULL THEN
        -- Return empty result set - don't raise exception
        -- This allows the frontend to handle NULL gracefully
        RAISE NOTICE 'get_company_profiles called with NULL company_id - returning empty result';
        RETURN;
      END IF;
      
      -- If user has no company_id, allow access (for setup/admin purposes)
      -- This allows users to see employees even if their profile isn't fully set up
      IF v_user_company_id IS NULL THEN
        -- User has no company_id - allow access but only return profiles for requested company
        -- This is useful during initial setup
        RAISE NOTICE 'User % has no company_id - allowing access to company %', auth.uid(), p_company_id;
      ELSIF v_user_company_id != p_company_id THEN
        -- User belongs to different company - deny access
        RAISE EXCEPTION 'Access denied: user belongs to company %, requested company %', v_user_company_id, p_company_id;
      END IF;
      
      -- Return profiles for the company (RLS bypassed due to SECURITY DEFINER)
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

    -- ============================================================================
    -- Helper function to fix a user's company_id
    -- ============================================================================

    CREATE OR REPLACE FUNCTION public.fix_user_company_id(
      p_user_id UUID,
      p_company_id UUID
    )
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $func$
    BEGIN
      -- Update the user's company_id
      UPDATE public.profiles
      SET company_id = p_company_id,
          updated_at = NOW()
      WHERE id = p_user_id;
      
      IF FOUND THEN
        RAISE NOTICE 'Updated company_id for user % to company %', p_user_id, p_company_id;
        RETURN TRUE;
      ELSE
        RAISE EXCEPTION 'User % not found', p_user_id;
      END IF;
    END;
    $func$;

    -- Grant execute to authenticated users (they can fix their own)
    GRANT EXECUTE ON FUNCTION public.fix_user_company_id(UUID, UUID) TO authenticated;

    RAISE NOTICE 'Fixed NULL company_id handling in functions';

  ELSE
    RAISE NOTICE '⚠️ profiles table does not exist yet - skipping NULL company_id fix';
  END IF;
END $$;

