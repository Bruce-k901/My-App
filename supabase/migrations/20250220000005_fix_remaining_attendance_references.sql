-- ============================================================================
-- Migration: Fix Remaining attendance_logs References
-- Description: Ensures all views and functions use staff_attendance table
--              This migration checks for and fixes any remaining references
-- ============================================================================

BEGIN;

-- Drop any views that might still reference attendance_logs
DROP VIEW IF EXISTS public.todays_attendance_old CASCADE;
DROP VIEW IF EXISTS public.active_shifts_old CASCADE;

-- Ensure todays_attendance view uses staff_attendance (should already exist, but recreate to be safe)
CREATE OR REPLACE VIEW public.todays_attendance AS
SELECT 
  sa.*,
  p.full_name,
  p.email,
  p.app_role,
  s.name AS site_name
FROM public.staff_attendance sa
JOIN public.profiles p ON p.id = sa.user_id
LEFT JOIN public.sites s ON s.id = sa.site_id
WHERE sa.clock_in_time::date = CURRENT_DATE
ORDER BY sa.clock_in_time DESC;

-- Check for any functions that might still reference attendance_logs
-- Note: These should have been updated in migration 20250220000002, but checking again

-- Verify is_user_clocked_in uses staff_attendance
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
  -- Check new staff_attendance table for active shift
  SELECT EXISTS (
    SELECT 1 FROM public.staff_attendance
    WHERE user_id = p_user_id
      AND shift_status = 'on_shift'
      AND clock_out_time IS NULL
      AND (p_site_id IS NULL OR site_id = p_site_id)
  ) INTO v_clocked_in;
  
  RETURN v_clocked_in;
END;
$$;

COMMIT;

-- Note: If you're still seeing 404 errors for attendance_logs, check:
-- 1. Browser cache - clear cache and hard refresh
-- 2. Any client-side code that might be caching table names
-- 3. Run this query to find any remaining references:
--    SELECT * FROM pg_views WHERE definition LIKE '%attendance_logs%';
--    SELECT proname, pg_get_functiondef(oid) FROM pg_proc 
--    WHERE pg_get_functiondef(oid) LIKE '%attendance_logs%';

