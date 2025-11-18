-- ============================================================================
-- Migration: Fix 406 Error on attendance_logs Queries
-- Description: Ensures attendance_logs table uses clock_in_date column
--              and removes any direct casting attempts
-- ============================================================================

BEGIN;

-- Step 1: Check if attendance_logs table exists
DO $$
BEGIN
  -- If table doesn't exist, this migration doesn't apply (table was dropped)
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'attendance_logs'
  ) THEN
    -- Step 2: Ensure clock_in_date column exists
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'attendance_logs' 
      AND column_name = 'clock_in_date'
    ) THEN
      -- Add clock_in_date column
      ALTER TABLE public.attendance_logs 
      ADD COLUMN clock_in_date DATE;
      
      -- Backfill existing rows
      UPDATE public.attendance_logs
      SET clock_in_date = (clock_in_at AT TIME ZONE 'UTC')::date
      WHERE clock_in_date IS NULL;
      
      RAISE NOTICE 'Added clock_in_date column to attendance_logs';
    END IF;

    -- Step 3: Ensure trigger function exists
    CREATE OR REPLACE FUNCTION update_attendance_logs_date()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.clock_in_date := (NEW.clock_in_at AT TIME ZONE 'UTC')::date;
      RETURN NEW;
    END;
    $$;

    -- Step 4: Drop and recreate trigger
    DROP TRIGGER IF EXISTS trg_update_attendance_logs_date ON public.attendance_logs;

    CREATE TRIGGER trg_update_attendance_logs_date
      BEFORE INSERT OR UPDATE OF clock_in_at ON public.attendance_logs
      FOR EACH ROW
      EXECUTE FUNCTION update_attendance_logs_date();

    -- Step 5: Ensure indexes exist
    CREATE INDEX IF NOT EXISTS idx_attendance_logs_clock_in_date 
    ON public.attendance_logs(clock_in_date);

    CREATE INDEX IF NOT EXISTS idx_attendance_logs_user_date 
    ON public.attendance_logs(user_id, clock_in_date) 
    WHERE clock_out_at IS NULL;

    CREATE INDEX IF NOT EXISTS idx_attendance_logs_site_date 
    ON public.attendance_logs(site_id, clock_in_date) 
    WHERE clock_out_at IS NULL;

    -- Step 6: Backfill any NULL values (safety check)
    UPDATE public.attendance_logs
    SET clock_in_date = (clock_in_at AT TIME ZONE 'UTC')::date
    WHERE clock_in_date IS NULL;

    RAISE NOTICE 'Fixed attendance_logs table for REST API compatibility';
  ELSE
    RAISE NOTICE 'attendance_logs table does not exist - migration not needed';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- Usage Notes:
-- 
-- ✅ CORRECT: Use clock_in_date column
-- GET /rest/v1/attendance_logs?select=id&user_id=eq.xxx&clock_in_date=eq.2025-11-18&clock_out_at=is.null&site_id=eq.xxx
--
-- ❌ INCORRECT: Don't use clock_in_at::date (causes 406 error)
-- GET /rest/v1/attendance_logs?select=id&user_id=eq.xxx&clock_in_at::date=eq.2025-11-18&clock_out_at=is.null&site_id=eq.xxx
-- ============================================================================

