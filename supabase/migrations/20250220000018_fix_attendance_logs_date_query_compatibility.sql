-- ============================================================================
-- Migration: Fix attendance_logs Date Query Compatibility
-- Description: Creates a PostgREST-compatible way to query attendance_logs
--              by date without using ::date casting in REST API filters
-- Note: This migration will be skipped if required tables don't exist yet
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if attendance_logs table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_logs') THEN

    -- Ensure clock_in_date column exists (from migration 17)
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'attendance_logs' 
      AND column_name = 'clock_in_date'
    ) THEN
      ALTER TABLE public.attendance_logs ADD COLUMN clock_in_date DATE;
      
      -- Update existing rows
      UPDATE public.attendance_logs
      SET clock_in_date = (clock_in_at AT TIME ZONE 'UTC')::date
      WHERE clock_in_date IS NULL;
      
      -- Create trigger to keep it updated
      CREATE OR REPLACE FUNCTION update_attendance_logs_date()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      AS $function$
      BEGIN
        NEW.clock_in_date := (NEW.clock_in_at AT TIME ZONE 'UTC')::date;
        RETURN NEW;
      END;
      $function$;
      
      DROP TRIGGER IF EXISTS trg_update_attendance_logs_date ON public.attendance_logs;
      
      CREATE TRIGGER trg_update_attendance_logs_date
        BEFORE INSERT OR UPDATE OF clock_in_at ON public.attendance_logs
        FOR EACH ROW
        EXECUTE FUNCTION update_attendance_logs_date();
      
      -- Create index
      CREATE INDEX IF NOT EXISTS idx_attendance_logs_clock_in_date 
      ON public.attendance_logs(clock_in_date);
    END IF;

    -- Create a view that filters by today's date (REST API compatible)
    -- This can be queried as: /rest/v1/todays_attendance_logs_view?site_id=eq.xxx
    DROP VIEW IF EXISTS public.todays_attendance_logs_view CASCADE;

    CREATE VIEW public.todays_attendance_logs_view AS
    SELECT 
      al.*
    FROM public.attendance_logs al
    WHERE al.clock_in_date = CURRENT_DATE;

    GRANT SELECT ON public.todays_attendance_logs_view TO authenticated;
    GRANT SELECT ON public.todays_attendance_logs_view TO anon;

    -- Create a view for active attendance (no date filter needed)
    DROP VIEW IF EXISTS public.active_attendance_logs_view CASCADE;

    CREATE VIEW public.active_attendance_logs_view AS
    SELECT 
      al.*
    FROM public.attendance_logs al
    WHERE al.clock_out_at IS NULL;

    GRANT SELECT ON public.active_attendance_logs_view TO authenticated;
    GRANT SELECT ON public.active_attendance_logs_view TO anon;

  ELSE
    RAISE NOTICE '⚠️ attendance_logs table does not exist yet - skipping date query compatibility fix';
  END IF;
END $$;

-- Note: The clock_in_date column allows REST API queries like:
-- /rest/v1/attendance_logs?clock_in_date=eq.2025-11-17&site_id=eq.xxx
-- 
-- The views provide alternative ways to query:
-- /rest/v1/todays_attendance_logs_view?site_id=eq.xxx
-- /rest/v1/active_attendance_logs_view?user_id=eq.xxx

