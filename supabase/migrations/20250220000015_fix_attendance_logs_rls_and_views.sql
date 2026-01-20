-- ============================================================================
-- Migration: Fix attendance_logs RLS and Views
-- Description: Ensures attendance_logs has proper RLS policies and views
--              that work with Supabase REST API (no date casting in filters)
-- Note: This migration will be skipped if required tables don't exist yet
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if attendance_logs table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_logs') THEN

    -- Ensure attendance_logs has proper RLS policies
    -- Drop existing policies first
    DROP POLICY IF EXISTS attendance_logs_select_own ON public.attendance_logs;
    DROP POLICY IF EXISTS attendance_logs_select_company ON public.attendance_logs;
    DROP POLICY IF EXISTS attendance_logs_insert_own ON public.attendance_logs;
    DROP POLICY IF EXISTS attendance_logs_update_own ON public.attendance_logs;

    -- Recreate RLS policies
    ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

    -- Staff can view their own attendance records
    CREATE POLICY attendance_logs_select_own
      ON public.attendance_logs FOR SELECT
      USING (
        user_id = auth.uid()
      );

    -- Managers and admins can view all attendance in their company
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      CREATE POLICY attendance_logs_select_company
        ON public.attendance_logs FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.company_id = attendance_logs.company_id
            AND p.app_role IN ('Manager', 'General Manager', 'Admin', 'Owner')
          )
        );

      -- Staff can insert their own attendance records
      CREATE POLICY attendance_logs_insert_own
        ON public.attendance_logs FOR INSERT
        WITH CHECK (
          user_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
            AND p.company_id = attendance_logs.company_id
          )
        );
    END IF;

    -- Staff can update their own attendance records
    CREATE POLICY attendance_logs_update_own
      ON public.attendance_logs FOR UPDATE
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    -- Create a view for today's attendance that works with REST API
    -- Uses timestamp range instead of date casting
    DROP VIEW IF EXISTS public.todays_attendance_logs CASCADE;

    CREATE VIEW public.todays_attendance_logs AS
    SELECT 
      al.*
    FROM public.attendance_logs al
    WHERE al.clock_in_at >= date_trunc('day', CURRENT_TIMESTAMP)
      AND al.clock_in_at < date_trunc('day', CURRENT_TIMESTAMP) + INTERVAL '1 day';

    -- Grant access to the view
    GRANT SELECT ON public.todays_attendance_logs TO authenticated;
    GRANT SELECT ON public.todays_attendance_logs TO anon;

    -- Create a view for active shifts (no date cast needed)
    DROP VIEW IF EXISTS public.active_attendance_logs CASCADE;

    CREATE VIEW public.active_attendance_logs AS
    SELECT 
      al.*
    FROM public.attendance_logs al
    WHERE al.clock_out_at IS NULL;

    -- Grant access to the view
    GRANT SELECT ON public.active_attendance_logs TO authenticated;
    GRANT SELECT ON public.active_attendance_logs TO anon;

  ELSE
    RAISE NOTICE '⚠️ attendance_logs table does not exist yet - skipping RLS and views fix';
  END IF;
END $$;

-- Note: These views provide REST API-friendly ways to query attendance
-- without using PostgreSQL date casting syntax that REST API doesn't support.

