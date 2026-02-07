-- ============================================================================
-- Migration: Fix Auto Clock-Out Column Name
-- Description: Fixes the auto_clock_out_after_closing function to use profile_id
--              instead of user_id (which doesn't exist in staff_attendance table)
-- ============================================================================

-- The original function referenced sa.user_id but the staff_attendance table
-- uses profile_id. This caused the cron job to fail silently.

-- First, drop the existing function (required because we're changing the return type)
DROP FUNCTION IF EXISTS public.auto_clock_out_after_closing();

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
AS $function$
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

  -- Log start of execution
  RAISE NOTICE 'Auto clock-out starting at %', v_current_time;

  -- Find all users who are currently clocked in (no clock_out_time)
  -- FIX: Changed user_id to profile_id to match staff_attendance table structure
  FOR v_attendance_record IN
    SELECT
      sa.id,
      sa.profile_id,  -- FIX: was user_id
      sa.site_id,
      sa.clock_in_time,
      p.home_site AS home_site_id  -- FIX: profiles uses home_site, not site_id
    FROM public.staff_attendance sa
    JOIN public.profiles p ON p.id = sa.profile_id  -- FIX: was user_id
    WHERE sa.clock_out_time IS NULL
      AND sa.shift_status = 'on_shift'
      AND p.home_site IS NOT NULL  -- FIX: profiles uses home_site
  LOOP
    BEGIN
      RAISE NOTICE 'Processing user % (attendance record %)', v_attendance_record.profile_id, v_attendance_record.id;

      -- Get the user's home site and its operating schedule
      SELECT
        s.id,
        s.operating_schedule
      INTO v_site_record
      FROM public.sites s
      WHERE s.id = v_attendance_record.home_site_id;

      -- Skip if site not found or no operating schedule
      IF v_site_record IS NULL THEN
        RAISE NOTICE 'Site not found for user %', v_attendance_record.profile_id;
        CONTINUE;
      END IF;

      IF v_site_record.operating_schedule IS NULL THEN
        RAISE NOTICE 'No operating schedule for site %', v_site_record.id;
        CONTINUE;
      END IF;

      v_schedule := v_site_record.operating_schedule::JSONB;

      -- Get the day name for the day the user clocked in
      -- PostgreSQL: 0=Sunday, 1=Monday, ..., 6=Saturday
      v_day_name := CASE EXTRACT(DOW FROM v_attendance_record.clock_in_time)
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
      END;

      RAISE NOTICE 'Day of clock-in: %', v_day_name;

      -- Get the schedule for the day they clocked in
      v_day_schedule := v_schedule->v_day_name;

      -- Skip if day is not active or schedule doesn't exist
      IF v_day_schedule IS NULL THEN
        RAISE NOTICE 'No schedule found for %', v_day_name;
        CONTINUE;
      END IF;

      IF (v_day_schedule->>'active')::BOOLEAN = FALSE THEN
        RAISE NOTICE 'Day % is not active', v_day_name;
        CONTINUE;
      END IF;

      -- Extract closing time (hh and mm)
      IF v_day_schedule->'close' IS NULL THEN
        RAISE NOTICE 'No closing time defined for %', v_day_name;
        CONTINUE;
      END IF;

      v_closing_hour := (v_day_schedule->'close'->>'hh')::INT;
      v_closing_minute := COALESCE((v_day_schedule->'close'->>'mm')::INT, 0);

      -- Build closing time for the day they clocked in
      v_closing_time := DATE_TRUNC('day', v_attendance_record.clock_in_time) +
                        (v_closing_hour || ' hours')::INTERVAL +
                        (v_closing_minute || ' minutes')::INTERVAL;

      -- Calculate auto clock-out time (2 hours after closing)
      v_auto_clock_out_time := v_closing_time + INTERVAL '2 hours';

      RAISE NOTICE 'Closing time: %, Auto clock-out time: %, Current time: %',
                   v_closing_time, v_auto_clock_out_time, v_current_time;

      -- Check if current time is 2+ hours after closing
      IF v_current_time >= v_auto_clock_out_time THEN
        RAISE NOTICE 'Auto clocking out user %', v_attendance_record.profile_id;

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
        user_id := v_attendance_record.profile_id;  -- FIX: was user_id
        site_id := v_attendance_record.home_site_id;
        clocked_out_at := v_auto_clock_out_time;
        closing_time := v_closing_time;
        hours_after_closing := EXTRACT(EPOCH FROM (v_current_time - v_closing_time)) / 3600.0;

        RETURN NEXT;
        v_clocked_out_count := v_clocked_out_count + 1;
      ELSE
        RAISE NOTICE 'Not yet time to auto clock-out user % (need to wait until %)',
                     v_attendance_record.profile_id, v_auto_clock_out_time;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing other users
      RAISE WARNING 'Error processing user %: %', v_attendance_record.profile_id, SQLERRM;
      CONTINUE;
    END;
  END LOOP;

  -- Log summary
  RAISE NOTICE 'Auto clock-out completed: % user(s) clocked out', v_clocked_out_count;

  RETURN;
END;
$function$;

COMMENT ON FUNCTION public.auto_clock_out_after_closing() IS
'Auto clocks out users who are still clocked in 2+ hours after their home site''s closing time.
Checks each user''s home site (from profiles.home_site) and uses the operating_schedule to determine
the closing time for the day they clocked in. If current time is 2+ hours after closing, automatically clocks them out.

Returns a table with details of each user that was auto clocked out.

Fixed 2026-02-03: Changed user_id to profile_id to match staff_attendance table structure.
Fixed 2026-02-03: Changed profiles.site_id to profiles.home_site to match profiles table structure.
Added detailed logging for debugging.';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.auto_clock_out_after_closing() TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_clock_out_after_closing() TO authenticated;

-- Ensure the cron job exists and is scheduled
DO $$
BEGIN
  -- Check if pg_cron is available
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Drop existing cron job if it exists (to recreate with fresh state)
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-clock-out-after-closing') THEN
      PERFORM cron.unschedule('auto-clock-out-after-closing');
      RAISE NOTICE 'Removed old auto-clock-out-after-closing cron job';
    END IF;

    -- Schedule the cron job to run every hour at minute 0
    PERFORM cron.schedule(
      'auto-clock-out-after-closing',
      '0 * * * *', -- Every hour at minute 0
      $cron$SELECT auto_clock_out_after_closing()$cron$
    );

    RAISE NOTICE 'Cron job "auto-clock-out-after-closing" scheduled successfully';
  ELSE
    RAISE NOTICE 'pg_cron extension not available - cron job not scheduled';
  END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the fix:
--
-- 1. Test the function manually:
--    SELECT * FROM auto_clock_out_after_closing();
--
-- 2. Check for users who should be auto clocked out:
--    SELECT
--      sa.id,
--      p.full_name,
--      p.home_site,
--      s.name AS site_name,
--      sa.clock_in_time,
--      s.operating_schedule
--    FROM staff_attendance sa
--    JOIN profiles p ON p.id = sa.profile_id
--    LEFT JOIN sites s ON s.id = p.home_site
--    WHERE sa.clock_out_time IS NULL
--      AND sa.shift_status = 'on_shift';
--
-- 3. Check cron job status:
--    SELECT * FROM cron.job WHERE jobname = 'auto-clock-out-after-closing';
--
-- 4. Check recent cron job executions:
--    SELECT * FROM cron.job_run_details
--    WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-clock-out-after-closing')
--    ORDER BY start_time DESC
--    LIMIT 10;
-- ============================================================================
