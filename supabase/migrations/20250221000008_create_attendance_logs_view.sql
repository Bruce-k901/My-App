-- ============================================================================
-- Migration: Create attendance_logs View as Alias for staff_attendance
-- Description: Creates a view that maps attendance_logs to staff_attendance
--              This allows old queries to continue working without code changes
-- ============================================================================
-- Note: This migration will be skipped if staff_attendance table doesn't exist yet

DO $$
BEGIN
  -- Only proceed if staff_attendance table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_attendance') THEN

    -- Drop the view if it exists
    DROP VIEW IF EXISTS public.attendance_logs CASCADE;

    -- Create a view that maps attendance_logs columns to staff_attendance columns
    -- This allows old code to work without modification
    -- NOTE: PostgREST doesn't support ::date casting, so we expose clock_in_date as a separate column
    CREATE VIEW public.attendance_logs AS
    SELECT 
      sa.id,
      sa.user_id,
      sa.company_id,
      sa.site_id,
      sa.clock_in_time AS clock_in_at,
      sa.clock_out_time AS clock_out_at,
      NULL::JSONB AS location, -- staff_attendance doesn't have location
      sa.shift_notes AS notes,
      sa.created_at,
      sa.updated_at,
      (sa.clock_in_time::date) AS clock_in_date -- Add clock_in_date column for date filtering (replaces clock_in_at::date)
    FROM public.staff_attendance sa;

    -- Note: We skip creating an index here because date casting with timestamptz requires
    -- IMMUTABLE functions and can be complex. The underlying staff_attendance table
    -- should already have indexes on clock_in_time which will help with queries.

    -- Grant access to authenticated users
    GRANT SELECT ON public.attendance_logs TO authenticated;
    GRANT SELECT ON public.attendance_logs TO anon;

    -- Add comment
    COMMENT ON VIEW public.attendance_logs IS 
    'Legacy view mapping attendance_logs to staff_attendance table. All queries will automatically use staff_attendance.';

    RAISE NOTICE 'Created attendance_logs view mapping to staff_attendance table';

  ELSE
    RAISE NOTICE '⚠️ staff_attendance table does not exist yet - skipping attendance_logs view creation';
  END IF;
END $$;

