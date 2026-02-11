-- Fix: auto_clock_out_after_closing uses profiles.site_id but the column is profiles.home_site
-- This caused the cron job to fail every run with: column p.site_id does not exist
-- Previous migrations kept toggling between site_id and home_site — this definitively uses home_site

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
  v_current_time TIMESTAMPTZ;
BEGIN
  v_current_time := NOW();

  RETURN QUERY
  WITH day_names AS (
    SELECT 0 AS dow, 'Sunday' AS day_name UNION ALL
    SELECT 1, 'Monday' UNION ALL
    SELECT 2, 'Tuesday' UNION ALL
    SELECT 3, 'Wednesday' UNION ALL
    SELECT 4, 'Thursday' UNION ALL
    SELECT 5, 'Friday' UNION ALL
    SELECT 6, 'Saturday'
  ),
  clocked_in_users AS (
    -- Find users still clocked in with a valid home site
    -- profiles.home_site is the correct column (NOT site_id)
    SELECT
      sa.id AS attendance_id,
      sa.profile_id,
      sa.clock_in_time,
      p.home_site AS home_site_id,
      s.operating_schedule
    FROM public.staff_attendance sa
    JOIN public.profiles p ON p.id = sa.profile_id
    JOIN public.sites s ON s.id = p.home_site
    WHERE sa.clock_out_time IS NULL
      AND sa.shift_status = 'on_shift'
      AND p.home_site IS NOT NULL
      AND s.operating_schedule IS NOT NULL
  ),
  users_with_closing AS (
    -- Get closing time from the operating schedule for the day they clocked in
    SELECT
      cu.*,
      dn.day_name,
      (cu.operating_schedule->dn.day_name) AS day_schedule
    FROM clocked_in_users cu
    JOIN day_names dn ON dn.dow = EXTRACT(DOW FROM cu.clock_in_time)::INT
    WHERE (cu.operating_schedule->dn.day_name->>'active')::BOOLEAN = TRUE
      AND cu.operating_schedule->dn.day_name->'close' IS NOT NULL
  ),
  users_to_clock_out AS (
    -- Calculate closing time and auto clock-out time (2h after closing)
    SELECT
      uwc.attendance_id,
      uwc.profile_id,
      uwc.home_site_id,
      uwc.clock_in_time,
      DATE_TRUNC('day', uwc.clock_in_time) +
        ((uwc.day_schedule->'close'->>'hh')::INT || ' hours')::INTERVAL +
        (COALESCE((uwc.day_schedule->'close'->>'mm')::INT, 0) || ' minutes')::INTERVAL AS calc_closing_time,
      DATE_TRUNC('day', uwc.clock_in_time) +
        ((uwc.day_schedule->'close'->>'hh')::INT || ' hours')::INTERVAL +
        (COALESCE((uwc.day_schedule->'close'->>'mm')::INT, 0) || ' minutes')::INTERVAL +
        INTERVAL '2 hours' AS auto_clock_out_time
    FROM users_with_closing uwc
  ),
  final_users AS (
    SELECT *
    FROM users_to_clock_out
    WHERE v_current_time >= auto_clock_out_time
  ),
  updated AS (
    UPDATE public.staff_attendance sa
    SET
      clock_out_time = fu.auto_clock_out_time,
      shift_status = 'off_shift',
      total_hours = EXTRACT(EPOCH FROM (fu.auto_clock_out_time - fu.clock_in_time)) / 3600.0,
      shift_notes = COALESCE(shift_notes, '') || E'\n[Auto clocked out 2 hours after site closing time]',
      updated_at = NOW()
    FROM final_users fu
    WHERE sa.id = fu.attendance_id
    RETURNING
      fu.profile_id,
      fu.home_site_id,
      fu.auto_clock_out_time,
      fu.calc_closing_time
  )
  SELECT
    u.profile_id,
    u.home_site_id,
    u.auto_clock_out_time,
    u.calc_closing_time,
    EXTRACT(EPOCH FROM (v_current_time - u.calc_closing_time)) / 3600.0
  FROM updated u;

END;
$function$;

COMMENT ON FUNCTION public.auto_clock_out_after_closing() IS
'Auto clocks out users still on shift 2+ hours after their home site closing time.
Uses profiles.home_site to find each user''s home site, then checks that site''s
operating_schedule for the closing time on the day they clocked in.

Fixed 2026-02-09: Definitively uses profiles.home_site (not site_id which does not exist).';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.auto_clock_out_after_closing() TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_clock_out_after_closing() TO authenticated;

-- Ensure the cron job is scheduled
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job to avoid duplicates
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-clock-out-after-closing') THEN
      PERFORM cron.unschedule('auto-clock-out-after-closing');
    END IF;

    -- Schedule to run every hour at minute 0
    PERFORM cron.schedule(
      'auto-clock-out-after-closing',
      '0 * * * *',
      $cron$SELECT * FROM auto_clock_out_after_closing()$cron$
    );

    RAISE NOTICE 'Cron job "auto-clock-out-after-closing" scheduled (every hour at :00)';
  ELSE
    RAISE NOTICE 'pg_cron extension not available — cron job not scheduled';
  END IF;
END $$;
