-- Repair: Fix auto_clock_out_after_closing function
-- The previous migration (20260205100000) was applied with sa.user_id instead of sa.profile_id
-- This caused the cron job to fail every run with: column sa.user_id does not exist

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
  v_clocked_out_count INT;
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
    SELECT
      sa.id AS attendance_id,
      sa.profile_id,
      sa.clock_in_time,
      p.site_id AS home_site_id,
      s.operating_schedule
    FROM public.staff_attendance sa
    JOIN public.profiles p ON p.id = sa.profile_id
    JOIN public.sites s ON s.id = p.site_id
    WHERE sa.clock_out_time IS NULL
      AND sa.shift_status = 'on_shift'
      AND p.site_id IS NOT NULL
      AND s.operating_schedule IS NOT NULL
  ),
  users_with_closing AS (
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
    SELECT
      uwc.attendance_id,
      uwc.profile_id,
      uwc.home_site_id,
      uwc.clock_in_time,
      DATE_TRUNC('day', uwc.clock_in_time) +
        ((uwc.day_schedule->'close'->>'hh')::INT || ' hours')::INTERVAL +
        ((uwc.day_schedule->'close'->>'mm')::INT || ' minutes')::INTERVAL AS calc_closing_time,
      DATE_TRUNC('day', uwc.clock_in_time) +
        ((uwc.day_schedule->'close'->>'hh')::INT || ' hours')::INTERVAL +
        ((uwc.day_schedule->'close'->>'mm')::INT || ' minutes')::INTERVAL +
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
