-- ============================================================================
-- Migration: Ensure All Functions Use staff_attendance
-- Description: Force update all functions to use staff_attendance instead of attendance_logs
--              This ensures no functions are still querying the old table
-- ============================================================================

BEGIN;

-- Update is_user_clocked_in function (if it still exists with old code)
CREATE OR REPLACE FUNCTION public.is_user_clocked_in(p_user_id UUID, p_site_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_clocked_in BOOLEAN;
BEGIN
  -- Use staff_attendance table
  SELECT EXISTS (
    SELECT 1 FROM public.staff_attendance
    WHERE user_id = p_user_id
      AND clock_out_time IS NULL
      AND shift_status = 'on_shift'
      AND (p_site_id IS NULL OR site_id = p_site_id)
      AND clock_in_time::date = CURRENT_DATE
  ) INTO v_clocked_in;
  
  RETURN v_clocked_in;
END;
$$;

-- Update get_active_staff_on_site function
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
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    sa.clock_in_time AS clock_in_at
  FROM public.staff_attendance sa
  JOIN public.profiles p ON p.id = sa.user_id
  WHERE sa.site_id = p_site_id
    AND sa.clock_out_time IS NULL
    AND sa.shift_status = 'on_shift'
    AND sa.clock_in_time::date = CURRENT_DATE
    AND p.app_role IN ('Staff', 'Manager', 'General Manager')
  ORDER BY sa.clock_in_time DESC;
END;
$$;

-- Update get_managers_on_shift function
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
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    sa.site_id,
    sa.clock_in_time AS clock_in_at
  FROM public.staff_attendance sa
  JOIN public.profiles p ON p.id = sa.user_id
  WHERE sa.clock_out_time IS NULL
    AND sa.shift_status = 'on_shift'
    AND sa.clock_in_time::date = CURRENT_DATE
    AND p.app_role IN ('Manager', 'General Manager', 'Admin', 'Owner')
    AND (p_site_id IS NULL OR sa.site_id = p_site_id)
    AND (p_company_id IS NULL OR p.company_id = p_company_id)
  ORDER BY sa.clock_in_time DESC;
END;
$$;

COMMIT;

-- Note: After applying migrations 20250220000012 and 20250220000013,
-- the attendance_logs table will exist and all functions will use staff_attendance.
-- This provides backward compatibility while ensuring new code works correctly.

