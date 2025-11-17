-- ============================================================================
-- Migration: Add Date Column via Trigger (Workaround for REST API)
-- Description: Adds a date column that's updated via trigger since
--              computed columns with date casting aren't immutable
-- ============================================================================

BEGIN;

-- Add clock_in_date column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'attendance_logs' 
    AND column_name = 'clock_in_date'
  ) THEN
    ALTER TABLE public.attendance_logs ADD COLUMN clock_in_date DATE;
  END IF;
END $$;

-- Create function to update clock_in_date
CREATE OR REPLACE FUNCTION update_attendance_logs_date()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.clock_in_date := (NEW.clock_in_at AT TIME ZONE 'UTC')::date;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_update_attendance_logs_date ON public.attendance_logs;

CREATE TRIGGER trg_update_attendance_logs_date
  BEFORE INSERT OR UPDATE OF clock_in_at ON public.attendance_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_logs_date();

-- Update existing rows
UPDATE public.attendance_logs
SET clock_in_date = (clock_in_at AT TIME ZONE 'UTC')::date
WHERE clock_in_date IS NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_attendance_logs_clock_in_date 
ON public.attendance_logs(clock_in_date);

COMMIT;

-- Note: This allows REST API queries like:
-- /rest/v1/attendance_logs?clock_in_date=eq.2025-11-17&site_id=eq.xxx
-- Instead of the unsupported: clock_in_at::date=eq.2025-11-17

