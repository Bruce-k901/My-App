-- ============================================================================
-- Migration: Auto Clock-Out After Site Closing Time
-- Description: Automatically clocks out users who forget to clock out
--              by checking if it's been 2+ hours after their home site's closing time
-- ============================================================================
-- 
-- This migration:
-- 1. Creates a function to auto clock-out users 2 hours after site closing
-- 2. Sets up a pg_cron job to run every hour
-- 3. Handles sites with different operating schedules per day
--
-- IMPORTANT: This only affects users who are still clocked in 2+ hours
--            after their home site's closing time for the current day
-- ============================================================================

BEGIN;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================================
-- Step 1: Create function to auto clock-out users after site closing
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_clock_out_after_closing()
RETURNS TABLE(
  user_id UUID,
  site_id UUID,
  clocked_out_at TIMESTAMPTZ,
  closing_time TIMESTAMPTZ,
  hours_after_closing DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attendance_record RECORD;
  v_site_record RECORD;
  v_day_name TEXT;
  v_closing_hour INT;
  v_closing_minute INT;
  v_closing_time TIMESTAMPTZ;
  v_auto_clock_out_time TIMESTAMPTZ;
  v_current_time TIMESTAMPTZ;
  v_clocked_out_count INT := 0;
  v_schedule JSONB;
  v_day_schedule JSONB;
BEGIN
  v_current_time := NOW();
  
  -- Find all users who are currently clocked in (no clock_out_time)
  FOR v_attendance_record IN
    SELECT 
      sa.id,
      sa.user_id,
      sa.site_id,
      sa.clock_in_time,
      p.site_id AS home_site_id
    FROM public.staff_attendance sa
    JOIN public.profiles p ON p.id = sa.user_id
    WHERE sa.clock_out_time IS NULL
      AND sa.shift_status = 'on_shift'
      AND p.site_id IS NOT NULL  -- Only process users with a home site
  LOOP
    BEGIN
      -- Get the user's home site and its operating schedule
      SELECT 
        s.id,
        s.operating_schedule
      INTO v_site_record
      FROM public.sites s
      WHERE s.id = v_attendance_record.home_site_id;
      
      -- Skip if site not found or no operating schedule
      IF v_site_record IS NULL OR v_site_record.operating_schedule IS NULL THEN
        CONTINUE;
      END IF;
      
      v_schedule := v_site_record.operating_schedule::JSONB;
      
      -- Get the day name for the day the user clocked in
      -- This handles cases where someone clocked in yesterday and forgot to clock out
      -- PostgreSQL: 0=Sunday, 1=Monday, ..., 6=Saturday
      -- We need: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
      v_day_name := CASE EXTRACT(DOW FROM v_attendance_record.clock_in_time)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
      END;
      
      -- Get the schedule for the day they clocked in
      v_day_schedule := v_schedule->v_day_name;
      
      -- Skip if day is not active or schedule doesn't exist
      IF v_day_schedule IS NULL OR (v_day_schedule->>'active')::BOOLEAN = FALSE THEN
        CONTINUE;
      END IF;
      
      -- Extract closing time (hh and mm)
      IF v_day_schedule->'close' IS NULL THEN
        CONTINUE;
      END IF;
      
      v_closing_hour := (v_day_schedule->'close'->>'hh')::INT;
      v_closing_minute := (v_day_schedule->'close'->>'mm')::INT;
      
      -- Build closing time for the day they clocked in
      -- This ensures we check against the correct day's closing time
      v_closing_time := DATE_TRUNC('day', v_attendance_record.clock_in_time) + 
                        (v_closing_hour || ' hours')::INTERVAL + 
                        (v_closing_minute || ' minutes')::INTERVAL;
      
      -- Calculate auto clock-out time (2 hours after closing)
      v_auto_clock_out_time := v_closing_time + INTERVAL '2 hours';
      
      -- Check if current time is 2+ hours after closing
      IF v_current_time >= v_auto_clock_out_time THEN
        -- Auto clock out the user
        UPDATE public.staff_attendance
        SET 
          clock_out_time = v_auto_clock_out_time,
          shift_status = 'off_shift',
          total_hours = EXTRACT(EPOCH FROM (v_auto_clock_out_time - v_attendance_record.clock_in_time)) / 3600.0,
          shift_notes = COALESCE(shift_notes, '') || E'\n[Auto clocked out 2 hours after site closing time]',
          updated_at = NOW()
        WHERE id = v_attendance_record.id;
        
        -- Return the result
        user_id := v_attendance_record.user_id;
        site_id := v_attendance_record.home_site_id;
        clocked_out_at := v_auto_clock_out_time;
        closing_time := v_closing_time;
        hours_after_closing := EXTRACT(EPOCH FROM (v_current_time - v_closing_time)) / 3600.0;
        
        RETURN NEXT;
        v_clocked_out_count := v_clocked_out_count + 1;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing other users
      RAISE WARNING 'Error processing user %: %', v_attendance_record.user_id, SQLERRM;
      CONTINUE;
    END;
  END LOOP;
  
  -- Log summary
  RAISE NOTICE 'Auto clock-out completed: % user(s) clocked out', v_clocked_out_count;
END;
$$;

COMMENT ON FUNCTION public.auto_clock_out_after_closing() IS 
'Auto clocks out users who are still clocked in 2+ hours after their home site''s closing time.
Checks each user''s home site (from profiles.site_id) and uses the operating_schedule to determine
today''s closing time. If current time is 2+ hours after closing, automatically clocks them out.

Returns a table with details of each user that was auto clocked out.';

-- ============================================================================
-- Step 2: Schedule the cron job to run every hour
-- ============================================================================

-- Drop existing cron job if it exists (to avoid duplicates)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-clock-out-after-closing') THEN
    PERFORM cron.unschedule('auto-clock-out-after-closing');
  END IF;
END $$;

-- Schedule the cron job to run every hour at minute 0
-- Cron expression: minute hour day month dayofweek
-- 0 * * * * = Every hour at minute 0
SELECT cron.schedule(
  'auto-clock-out-after-closing',
  '0 * * * *', -- Every hour at minute 0
  $$SELECT auto_clock_out_after_closing()$$
);

-- Verify the cron job was created
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-clock-out-after-closing') THEN
    RAISE NOTICE '✅ Cron job "auto-clock-out-after-closing" scheduled successfully to run every hour';
  ELSE
    RAISE WARNING '⚠️ Cron job creation may have failed. Please check manually.';
  END IF;
END $$;

-- ============================================================================
-- Step 3: Grant permissions
-- ============================================================================

-- Grant execute permission to service_role (for cron)
GRANT EXECUTE ON FUNCTION public.auto_clock_out_after_closing() TO service_role;

-- Grant execute permission to authenticated users (for manual testing)
GRANT EXECUTE ON FUNCTION public.auto_clock_out_after_closing() TO authenticated;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this migration, verify everything works:
--
-- 1. Check the cron job exists:
--    SELECT * FROM cron.job WHERE jobname = 'auto-clock-out-after-closing';
--
-- 2. Test the function manually:
--    SELECT * FROM auto_clock_out_after_closing();
--
-- 3. Check for users who should be auto clocked out:
--    SELECT 
--      sa.id,
--      p.full_name,
--      s.name AS site_name,
--      sa.clock_in_time,
--      s.operating_schedule
--    FROM staff_attendance sa
--    JOIN profiles p ON p.id = sa.user_id
--    JOIN sites s ON s.id = p.site_id
--    WHERE sa.clock_out_time IS NULL
--      AND sa.shift_status = 'on_shift';
--
-- 4. Monitor cron job execution:
--    SELECT * FROM cron.job_run_details 
--    WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-clock-out-after-closing')
--    ORDER BY start_time DESC
--    LIMIT 10;
-- ============================================================================

