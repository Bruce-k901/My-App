-- ============================================================================
-- Migration: Fix attendance_logs REST API Query (Final Fix)
-- Description: Ensures clock_in_date column exists and is properly maintained
--              This fixes the 406 error from queries using clock_in_at::date
-- Note: This migration will be skipped if required tables don't exist yet
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if attendance_logs table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance_logs') THEN

    -- Step 1: Ensure clock_in_date column exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'attendance_logs' 
      AND column_name = 'clock_in_date'
    ) THEN
      ALTER TABLE public.attendance_logs ADD COLUMN clock_in_date DATE;
      
      -- Backfill existing rows
      UPDATE public.attendance_logs
      SET clock_in_date = (clock_in_at AT TIME ZONE 'UTC')::date
      WHERE clock_in_date IS NULL;
    END IF;

    -- Step 2: Ensure trigger function exists and is correct
    CREATE OR REPLACE FUNCTION update_attendance_logs_date()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $function$
    BEGIN
      NEW.clock_in_date := (NEW.clock_in_at AT TIME ZONE 'UTC')::date;
      RETURN NEW;
    END;
    $function$;

    -- Step 3: Drop and recreate trigger to ensure it's active
    DROP TRIGGER IF EXISTS trg_update_attendance_logs_date ON public.attendance_logs;

    CREATE TRIGGER trg_update_attendance_logs_date
      BEFORE INSERT OR UPDATE OF clock_in_at ON public.attendance_logs
      FOR EACH ROW
      EXECUTE FUNCTION update_attendance_logs_date();

    -- Step 4: Ensure index exists for performance
    CREATE INDEX IF NOT EXISTS idx_attendance_logs_clock_in_date 
    ON public.attendance_logs(clock_in_date);

    CREATE INDEX IF NOT EXISTS idx_attendance_logs_user_date 
    ON public.attendance_logs(user_id, clock_in_date) 
    WHERE clock_out_at IS NULL;

    CREATE INDEX IF NOT EXISTS idx_attendance_logs_site_date 
    ON public.attendance_logs(site_id, clock_in_date) 
    WHERE clock_out_at IS NULL;

    -- Step 5: Backfill any NULL values (safety check)
    UPDATE public.attendance_logs
    SET clock_in_date = (clock_in_at AT TIME ZONE 'UTC')::date
    WHERE clock_in_date IS NULL;

    -- Step 6: Create a view for today's attendance (alternative query method)
    DROP VIEW IF EXISTS public.todays_attendance_logs_view CASCADE;

    CREATE VIEW public.todays_attendance_logs_view AS
    SELECT 
      al.*
    FROM public.attendance_logs al
    WHERE al.clock_in_date = CURRENT_DATE;

    GRANT SELECT ON public.todays_attendance_logs_view TO authenticated;
    GRANT SELECT ON public.todays_attendance_logs_view TO anon;

    -- Step 7: Create a view for active attendance (no date filter needed)
    DROP VIEW IF EXISTS public.active_attendance_logs_view CASCADE;

    CREATE VIEW public.active_attendance_logs_view AS
    SELECT 
      al.*
    FROM public.attendance_logs al
    WHERE al.clock_out_at IS NULL;

    GRANT SELECT ON public.active_attendance_logs_view TO authenticated;
    GRANT SELECT ON public.active_attendance_logs_view TO anon;

  ELSE
    RAISE NOTICE '⚠️ attendance_logs table does not exist yet - skipping REST API query fix';
  END IF;
END $$;

-- ============================================================================
-- Usage Notes:
-- 
-- ✅ CORRECT: Use clock_in_date column
-- GET /rest/v1/attendance_logs?select=id&user_id=eq.xxx&clock_in_date=eq.2025-11-17&clock_out_at=is.null&site_id=eq.xxx
--
-- ❌ INCORRECT: Don't use clock_in_at::date (causes 406 error)
-- GET /rest/v1/attendance_logs?select=id&user_id=eq.xxx&clock_in_at::date=eq.2025-11-17&clock_out_at=is.null&site_id=eq.xxx
--
-- Alternative: Use RPC function
-- POST /rest/v1/rpc/is_user_clocked_in_today
-- Body: {"p_user_id": "...", "p_site_id": "...", "p_date": "2025-11-17"}
-- ============================================================================

