-- ============================================================================
-- Fix Auto Clock-Out Function
-- ============================================================================
-- This script fixes potential issues with the auto clock-out functionality:
-- 1. Handles null/empty closing times gracefully
-- 2. Adds fallback for 24-hour clockout if site schedule is missing
-- 3. Ensures cron job is properly scheduled
-- 4. Adds better error handling
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Improved auto clock-out function with better error handling
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_clock_out_after_closing()
RETURNS TABLE(
  user_id UUID,
  site_id UUID,
  clocked_out_at TIMESTAMPTZ,
  closing_time TIMESTAMPTZ,
  hours_after_closing DECIMAL,
  reason TEXT
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
  v_reason TEXT;
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
      v_reason := NULL;
      
      -- Get the user's home site and its operating schedule
      SELECT 
        s.id,
        s.operating_schedule
      INTO v_site_record
      FROM public.sites s
      WHERE s.id = v_attendance_record.home_site_id;
      
      -- Skip if site not found
      IF v_site_record IS NULL THEN
        -- Fallback: Auto clock out if clocked in for more than 24 hours
        IF v_attendance_record.clock_in_time < NOW() - INTERVAL '24 hours' THEN
          v_auto_clock_out_time := v_attendance_record.clock_in_time + INTERVAL '24 hours';
          
          UPDATE public.staff_attendance
          SET 
            clock_out_time = v_auto_clock_out_time,
            shift_status = 'off_shift',
            total_hours = 24.0,
            shift_notes = COALESCE(shift_notes, '') || E'\n[Auto clocked out after 24 hours - no site schedule found]',
            updated_at = NOW()
          WHERE id = v_attendance_record.id;
          
          user_id := v_attendance_record.user_id;
          site_id := v_attendance_record.home_site_id;
          clocked_out_at := v_auto_clock_out_time;
          closing_time := NULL;
          hours_after_closing := 24.0;
          reason := 'No site schedule - 24 hour fallback';
          RETURN NEXT;
          v_clocked_out_count := v_clocked_out_count + 1;
        END IF;
        CONTINUE;
      END IF;
      
      -- If no operating schedule, use 24-hour fallback
      IF v_site_record.operating_schedule IS NULL THEN
        IF v_attendance_record.clock_in_time < NOW() - INTERVAL '24 hours' THEN
          v_auto_clock_out_time := v_attendance_record.clock_in_time + INTERVAL '24 hours';
          
          UPDATE public.staff_attendance
          SET 
            clock_out_time = v_auto_clock_out_time,
            shift_status = 'off_shift',
            total_hours = 24.0,
            shift_notes = COALESCE(shift_notes, '') || E'\n[Auto clocked out after 24 hours - no operating schedule]',
            updated_at = NOW()
          WHERE id = v_attendance_record.id;
          
          user_id := v_attendance_record.user_id;
          site_id := v_attendance_record.home_site_id;
          clocked_out_at := v_auto_clock_out_time;
          closing_time := NULL;
          hours_after_closing := 24.0;
          reason := 'No operating schedule - 24 hour fallback';
          RETURN NEXT;
          v_clocked_out_count := v_clocked_out_count + 1;
        END IF;
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
      
      -- Get the schedule for the day they clocked in
      v_day_schedule := v_schedule->v_day_name;
      
      -- If day is not active or schedule doesn't exist, use 24-hour fallback
      IF v_day_schedule IS NULL OR (v_day_schedule->>'active')::BOOLEAN = FALSE THEN
        IF v_attendance_record.clock_in_time < NOW() - INTERVAL '24 hours' THEN
          v_auto_clock_out_time := v_attendance_record.clock_in_time + INTERVAL '24 hours';
          
          UPDATE public.staff_attendance
          SET 
            clock_out_time = v_auto_clock_out_time,
            shift_status = 'off_shift',
            total_hours = 24.0,
            shift_notes = COALESCE(shift_notes, '') || E'\n[Auto clocked out after 24 hours - day not active in schedule]',
            updated_at = NOW()
          WHERE id = v_attendance_record.id;
          
          user_id := v_attendance_record.user_id;
          site_id := v_attendance_record.home_site_id;
          clocked_out_at := v_auto_clock_out_time;
          closing_time := NULL;
          hours_after_closing := 24.0;
          reason := 'Day not active - 24 hour fallback';
          RETURN NEXT;
          v_clocked_out_count := v_clocked_out_count + 1;
        END IF;
        CONTINUE;
      END IF;
      
      -- Extract closing time (hh and mm) with null handling
      IF v_day_schedule->'close' IS NULL THEN
        -- Fallback to 24 hours if no closing time
        IF v_attendance_record.clock_in_time < NOW() - INTERVAL '24 hours' THEN
          v_auto_clock_out_time := v_attendance_record.clock_in_time + INTERVAL '24 hours';
          
          UPDATE public.staff_attendance
          SET 
            clock_out_time = v_auto_clock_out_time,
            shift_status = 'off_shift',
            total_hours = 24.0,
            shift_notes = COALESCE(shift_notes, '') || E'\n[Auto clocked out after 24 hours - no closing time in schedule]',
            updated_at = NOW()
          WHERE id = v_attendance_record.id;
          
          user_id := v_attendance_record.user_id;
          site_id := v_attendance_record.home_site_id;
          clocked_out_at := v_auto_clock_out_time;
          closing_time := NULL;
          hours_after_closing := 24.0;
          reason := 'No closing time - 24 hour fallback';
          RETURN NEXT;
          v_clocked_out_count := v_clocked_out_count + 1;
        END IF;
        CONTINUE;
      END IF;
      
      -- Safely extract closing hour and minute with null/empty string handling
      v_closing_hour := NULLIF((v_day_schedule->'close'->>'hh'), '')::INT;
      v_closing_minute := NULLIF((v_day_schedule->'close'->>'mm'), '')::INT;
      
      -- If closing time is null or invalid, use 24-hour fallback
      IF v_closing_hour IS NULL OR v_closing_minute IS NULL THEN
        IF v_attendance_record.clock_in_time < NOW() - INTERVAL '24 hours' THEN
          v_auto_clock_out_time := v_attendance_record.clock_in_time + INTERVAL '24 hours';
          
          UPDATE public.staff_attendance
          SET 
            clock_out_time = v_auto_clock_out_time,
            shift_status = 'off_shift',
            total_hours = 24.0,
            shift_notes = COALESCE(shift_notes, '') || E'\n[Auto clocked out after 24 hours - invalid closing time]',
            updated_at = NOW()
          WHERE id = v_attendance_record.id;
          
          user_id := v_attendance_record.user_id;
          site_id := v_attendance_record.home_site_id;
          clocked_out_at := v_auto_clock_out_time;
          closing_time := NULL;
          hours_after_closing := 24.0;
          reason := 'Invalid closing time - 24 hour fallback';
          RETURN NEXT;
          v_clocked_out_count := v_clocked_out_count + 1;
        END IF;
        CONTINUE;
      END IF;
      
      -- Build closing time for the day they clocked in
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
        reason := '2 hours after closing time';
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
the closing time. If current time is 2+ hours after closing, automatically clocks them out.
Falls back to 24-hour auto clockout if site schedule is missing or invalid.';

-- ============================================================================
-- Step 2: Ensure cron job is scheduled
-- ============================================================================

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop existing cron job if it exists (to avoid duplicates)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-clock-out-after-closing') THEN
    PERFORM cron.unschedule('auto-clock-out-after-closing');
    RAISE NOTICE 'Removed existing cron job';
  END IF;
END $$;

-- Schedule the cron job to run every hour at minute 0
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

GRANT EXECUTE ON FUNCTION public.auto_clock_out_after_closing() TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_clock_out_after_closing() TO authenticated;

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this script, verify everything works:
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
--      sa.clock_out_time,
--      sa.shift_status
--    FROM staff_attendance sa
--    JOIN profiles p ON p.id = sa.user_id
--    LEFT JOIN sites s ON s.id = p.site_id
--    WHERE sa.clock_out_time IS NULL
--      AND sa.shift_status = 'on_shift';
--
-- 4. Monitor cron job execution:
--    SELECT * FROM cron.job_run_details 
--    WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-clock-out-after-closing')
--    ORDER BY start_time DESC
--    LIMIT 10;
-- ============================================================================

