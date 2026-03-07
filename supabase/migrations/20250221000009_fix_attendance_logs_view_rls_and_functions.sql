-- ============================================================================
-- Migration: Fix attendance_logs View RLS and Update Functions
-- Description: Adds RLS policies to attendance_logs view and updates functions
--              to use clock_in_date instead of clock_in_at::date
--              This fixes the 406 (Not Acceptable) error
-- ============================================================================
-- Note: This migration will be skipped if attendance_logs view doesn't exist yet

DO $$
BEGIN
  -- Only proceed if attendance_logs view exists
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public'
    AND table_name = 'attendance_logs'
  ) THEN

    -- ============================================================================
    -- Step 1: Ensure attendance_logs view is accessible
    -- ============================================================================

    -- Note: Views don't support RLS policies directly - they inherit RLS from the underlying table
    -- The attendance_logs view queries staff_attendance, so it will use staff_attendance's RLS policies
    -- We just need to ensure the view has proper SELECT grants

    -- Grant necessary permissions (ensure they're correct)
    GRANT SELECT ON public.attendance_logs TO authenticated;
    GRANT SELECT ON public.attendance_logs TO anon;

    -- ============================================================================
    -- Step 2: Update notification system functions to use clock_in_date
    -- ============================================================================

    -- Update is_user_clocked_in_today function to use clock_in_date
    CREATE OR REPLACE FUNCTION public.is_user_clocked_in_today(
      p_user_id UUID,
      p_site_id UUID DEFAULT NULL,
      p_date DATE DEFAULT CURRENT_DATE
    )
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    SET search_path = public
    AS $function$
    DECLARE
      v_clocked_in BOOLEAN;
    BEGIN
      -- Use clock_in_date column from the view instead of clock_in_at::date
      IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'attendance_logs') THEN
        SELECT EXISTS (
          SELECT 1 FROM public.attendance_logs al
          WHERE al.user_id = p_user_id
            AND al.clock_out_at IS NULL
            AND (p_site_id IS NULL OR al.site_id = p_site_id)
            AND al.clock_in_date = p_date
        ) INTO v_clocked_in;
      ELSE
        v_clocked_in := FALSE;
      END IF;
      
      RETURN v_clocked_in;
    END;
    $function$;

    -- Update get_active_staff_on_site function to use clock_in_date
    CREATE OR REPLACE FUNCTION public.get_active_staff_on_site(p_site_id UUID)
    RETURNS TABLE (
      user_id UUID,
      full_name TEXT,
      email TEXT,
      clock_in_at TIMESTAMPTZ
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    SET search_path = public
    AS $function$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'attendance_logs')
         AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        RETURN QUERY
        SELECT 
          p.id,
          p.full_name,
          p.email,
          a.clock_in_at
        FROM public.attendance_logs a
        JOIN public.profiles p ON p.id = a.user_id
        WHERE a.site_id = p_site_id
          AND a.clock_out_at IS NULL
          AND a.clock_in_date = CURRENT_DATE
          AND p.app_role IN ('Staff', 'Manager', 'General Manager')
        ORDER BY a.clock_in_at DESC;
      END IF;
    END;
    $function$;

    -- Update get_managers_on_shift function to use clock_in_date
    CREATE OR REPLACE FUNCTION public.get_managers_on_shift(p_site_id UUID DEFAULT NULL, p_company_id UUID DEFAULT NULL)
    RETURNS TABLE (
      user_id UUID,
      full_name TEXT,
      email TEXT,
      site_id UUID,
      clock_in_at TIMESTAMPTZ
    )
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    SET search_path = public
    AS $function$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'attendance_logs')
         AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        RETURN QUERY
        SELECT 
          p.id,
          p.full_name,
          p.email,
          a.site_id,
          a.clock_in_at
        FROM public.attendance_logs a
        JOIN public.profiles p ON p.id = a.user_id
        WHERE a.clock_out_at IS NULL
          AND a.clock_in_date = CURRENT_DATE
          AND p.app_role IN ('Manager', 'General Manager', 'Admin', 'Owner')
          AND (p_site_id IS NULL OR a.site_id = p_site_id)
          AND (p_company_id IS NULL OR p.company_id = p_company_id)
        ORDER BY a.clock_in_at DESC;
      END IF;
    END;
    $function$;

    RAISE NOTICE 'Updated attendance_logs view functions to use clock_in_date';

  ELSE
    RAISE NOTICE '⚠️ attendance_logs view does not exist yet - skipping function updates';
  END IF;
END $$;

-- ============================================================================
-- Verification Notes:
-- 
-- After applying this migration:
-- 1. The attendance_logs view should be accessible via REST API
-- 2. All functions now use clock_in_date instead of clock_in_at::date
-- 3. Queries should work: GET /rest/v1/attendance_logs?select=id&clock_in_date=eq.2025-11-18&site_id=eq.xxx
-- 
-- If you still see 406 errors:
-- 1. Clear browser cache (Ctrl+Shift+R)
-- 2. Restart Next.js dev server
-- 3. Check that the view exists: SELECT * FROM attendance_logs LIMIT 1;
-- 4. Check that clock_in_date column exists: SELECT clock_in_date FROM attendance_logs LIMIT 1;
-- ============================================================================

