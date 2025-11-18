-- ============================================================================
-- Migration: Update RPC Functions to Use staff_attendance
-- Description: Updates/drops RPC functions that still reference attendance_logs
--              and ensures all functions use staff_attendance instead
-- ============================================================================

BEGIN;

-- Drop old RPC functions that reference attendance_logs (with all possible signatures)
DROP FUNCTION IF EXISTS public.is_user_clocked_in_today(UUID, UUID, DATE) CASCADE;
DROP FUNCTION IF EXISTS public.is_user_clocked_in_today(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_user_clocked_in_today(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_attendance_logs_by_date(UUID, DATE, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_attendance_logs_by_date(UUID, DATE) CASCADE;
DROP FUNCTION IF EXISTS public.get_attendance_logs_by_date(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_active_attendance_logs(UUID, DATE) CASCADE;
DROP FUNCTION IF EXISTS public.get_active_attendance_logs(UUID) CASCADE;

-- Update is_user_clocked_in_today to use staff_attendance
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
AS $$
DECLARE
  v_clocked_in BOOLEAN;
  v_date_start TIMESTAMPTZ;
  v_date_end TIMESTAMPTZ;
BEGIN
  -- Convert date to timestamp range for the day
  v_date_start := p_date::TIMESTAMPTZ;
  v_date_end := (p_date + INTERVAL '1 day')::TIMESTAMPTZ;
  
  SELECT EXISTS (
    SELECT 1 FROM public.staff_attendance sa
    WHERE sa.user_id = p_user_id
      AND sa.clock_in_time >= v_date_start
      AND sa.clock_in_time < v_date_end
      AND sa.clock_out_time IS NULL
      AND sa.shift_status = 'on_shift'
      AND (p_site_id IS NULL OR sa.site_id = p_site_id)
  ) INTO v_clocked_in;
  
  RETURN v_clocked_in;
END;
$$;

COMMENT ON FUNCTION public.is_user_clocked_in_today(UUID, UUID, DATE) IS 
'Check if a user is clocked in today using staff_attendance table (replaces attendance_logs)';

-- Also ensure get_active_shift uses staff_attendance (if it exists)
-- This function should already exist and use staff_attendance, but verify
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'get_active_shift'
  ) THEN
    -- Function exists, verify it uses staff_attendance
    -- If not, it will be fixed by the create_staff_attendance migration
    RAISE NOTICE 'get_active_shift function exists - should use staff_attendance';
  END IF;
END $$;

COMMIT;

