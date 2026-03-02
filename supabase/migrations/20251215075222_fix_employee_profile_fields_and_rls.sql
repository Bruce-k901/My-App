-- ============================================================================
-- Migration: 20251215075222_fix_employee_profile_fields_and_rls.sql
-- Description:
-- 1) Expand get_company_profiles() to return employee profile fields used in UI
--    (nationality, address, emergency_contacts, etc.) so list/expanded cards show
--    freshly-saved data.
-- 2) Ensure admins/managers/owners can UPDATE profiles in their company (RLS)
--    so edit modal saves work for other employees.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
  ) THEN

    -- ------------------------------------------------------------------------
    -- Helper functions (SECURITY DEFINER) to avoid RLS recursion
    -- ------------------------------------------------------------------------
    CREATE OR REPLACE FUNCTION public.get_user_company_id()
    RETURNS UUID
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    SET search_path = public
    AS $func$
    DECLARE
      v_company_id UUID;
    BEGIN
      SELECT p.company_id INTO v_company_id
      FROM public.profiles p
      WHERE p.id = auth.uid() OR p.auth_user_id = auth.uid()
      LIMIT 1;

      RETURN v_company_id;
    END;
    $func$;

    CREATE OR REPLACE FUNCTION public.get_user_role()
    RETURNS TEXT
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    SET search_path = public
    AS $func$
    DECLARE
      v_role TEXT;
    BEGIN
      SELECT p.app_role::TEXT INTO v_role
      FROM public.profiles p
      WHERE p.id = auth.uid() OR p.auth_user_id = auth.uid()
      LIMIT 1;

      RETURN v_role;
    END;
    $func$;

    GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated;
    GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

    -- ------------------------------------------------------------------------
    -- RLS UPDATE policy: allow company admins/managers/owners to update profiles
    -- ------------------------------------------------------------------------
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS profiles_update_company ON public.profiles;

    CREATE POLICY profiles_update_company
      ON public.profiles
      FOR UPDATE
      USING (
        id = auth.uid()
        OR (
          company_id IS NOT NULL
          AND company_id = public.get_user_company_id()
          AND public.get_user_company_id() IS NOT NULL
          AND public.get_user_role() IN (
            'Admin', 'Manager', 'General Manager', 'Owner', 'Super Admin',
            'admin', 'manager', 'general_manager', 'owner', 'super_admin'
          )
        )
      )
      WITH CHECK (
        id = auth.uid()
        OR (
          company_id IS NOT NULL
          AND company_id = public.get_user_company_id()
          AND public.get_user_company_id() IS NOT NULL
          AND public.get_user_role() IN (
            'Admin', 'Manager', 'General Manager', 'Owner', 'Super Admin',
            'admin', 'manager', 'general_manager', 'owner', 'super_admin'
          )
        )
      );

    -- ------------------------------------------------------------------------
    -- Expand get_company_profiles() return columns used in the employees UI
    -- ------------------------------------------------------------------------
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
      app_role TEXT,
      company_id UUID,
      contract_type TEXT,
      reports_to UUID,
      auth_user_id UUID,
      nationality TEXT,
      address_line_1 TEXT,
      address_line_2 TEXT,
      city TEXT,
      county TEXT,
      postcode TEXT,
      country TEXT,
      emergency_contacts JSONB
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    SET search_path = public
    AS $func$
    DECLARE
      v_user_company_id UUID;
    BEGIN
      -- User company_id may be NULL during setup
      SELECT p_check.company_id INTO v_user_company_id
      FROM public.profiles p_check
      WHERE p_check.id = auth.uid() OR p_check.auth_user_id = auth.uid()
      LIMIT 1;

      IF p_company_id IS NULL THEN
        RAISE NOTICE 'get_company_profiles called with NULL company_id - returning empty result';
        RETURN;
      END IF;

      IF v_user_company_id IS NULL THEN
        RAISE NOTICE 'User % has no company_id - allowing access to company %', auth.uid(), p_company_id;
      ELSIF v_user_company_id != p_company_id THEN
        RAISE EXCEPTION 'Access denied: user belongs to company %, requested company %', v_user_company_id, p_company_id;
      END IF;

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
        p.app_role::TEXT,
        p.company_id,
        p.contract_type,
        p.reports_to,
        p.auth_user_id,
        p.nationality,
        p.address_line_1,
        p.address_line_2,
        p.city,
        p.county,
        p.postcode,
        p.country,
        p.emergency_contacts
      FROM public.profiles p
      WHERE p.company_id = p_company_id;
    END;
    $func$;

    GRANT EXECUTE ON FUNCTION public.get_company_profiles(UUID) TO authenticated;

  ELSE
    RAISE NOTICE '⚠️ profiles table does not exist yet - skipping employee profile fixes';
  END IF;
END $$;
