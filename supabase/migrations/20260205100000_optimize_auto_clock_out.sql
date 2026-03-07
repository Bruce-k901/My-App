-- Migration: Optimize auto_clock_out_after_closing function
-- Priority: HIGH
-- Issue: Current function uses row-by-row processing with FOR LOOP (204ms avg)
-- Solution: Rewrite as set-based operation for 10x+ performance improvement
-- Note: staff_attendance uses profile_id, not user_id

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

  -- Perform bulk update using CTEs for set-based operation
  WITH day_names AS (
    -- Map PostgreSQL DOW (0=Sun) to day names
    SELECT 0 AS dow, 'Sunday' AS day_name UNION ALL
    SELECT 1, 'Monday' UNION ALL
    SELECT 2, 'Tuesday' UNION ALL
    SELECT 3, 'Wednesday' UNION ALL
    SELECT 4, 'Thursday' UNION ALL
    SELECT 5, 'Friday' UNION ALL
    SELECT 6, 'Saturday'
  ),
  clocked_in_users AS (
    -- Find all users who are currently clocked in with valid home sites
    -- Note: staff_attendance uses profile_id, profiles has site_id as home_site
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
    -- Calculate closing time for each user based on their clock-in day
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
    -- Calculate exact closing time and identify who should be clocked out
    SELECT
      uwc.attendance_id,
      uwc.profile_id,
      uwc.home_site_id,
      uwc.clock_in_time,
      -- Build closing time
      DATE_TRUNC('day', uwc.clock_in_time) +
        ((uwc.day_schedule->'close'->>'hh')::INT || ' hours')::INTERVAL +
        ((uwc.day_schedule->'close'->>'mm')::INT || ' minutes')::INTERVAL AS calc_closing_time,
      -- Auto clock-out time (2 hours after closing)
      DATE_TRUNC('day', uwc.clock_in_time) +
        ((uwc.day_schedule->'close'->>'hh')::INT || ' hours')::INTERVAL +
        ((uwc.day_schedule->'close'->>'mm')::INT || ' minutes')::INTERVAL +
        INTERVAL '2 hours' AS auto_clock_out_time
    FROM users_with_closing uwc
  ),
  final_users AS (
    -- Filter to only those who need to be clocked out
    SELECT *
    FROM users_to_clock_out
    WHERE v_current_time >= auto_clock_out_time
  ),
  -- Perform bulk update and return updated records
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
  -- Insert results into return table
  SELECT
    u.profile_id AS user_id,  -- Return as user_id for API compatibility
    u.home_site_id AS site_id,
    u.auto_clock_out_time AS clocked_out_at,
    u.calc_closing_time AS closing_time,
    EXTRACT(EPOCH FROM (v_current_time - u.calc_closing_time)) / 3600.0 AS hours_after_closing
  INTO user_id, site_id, clocked_out_at, closing_time, hours_after_closing
  FROM updated u
  LIMIT 1;

  GET DIAGNOSTICS v_clocked_out_count = ROW_COUNT;

  -- Log summary
  IF v_clocked_out_count > 0 THEN
    RAISE NOTICE 'Auto clock-out completed: % user(s) clocked out', v_clocked_out_count;
  END IF;

  -- Return all updated records
  RETURN QUERY
  SELECT
    sa.profile_id AS user_id,
    p.site_id AS site_id,
    sa.clock_out_time AS clocked_out_at,
    sa.clock_out_time - INTERVAL '2 hours' AS closing_time,
    EXTRACT(EPOCH FROM (v_current_time - (sa.clock_out_time - INTERVAL '2 hours'))) / 3600.0 AS hours_after_closing
  FROM public.staff_attendance sa
  JOIN public.profiles p ON p.id = sa.profile_id
  WHERE sa.updated_at >= v_current_time - INTERVAL '1 second'
    AND sa.shift_notes LIKE '%Auto clocked out%';

END;
$function$;

-- Add helpful comment
COMMENT ON FUNCTION public.auto_clock_out_after_closing() IS
'Optimized version: Uses set-based operations instead of row-by-row processing.
Auto clocks out users who are still clocked in 2+ hours after their home site closing time.
Expected performance: ~10-50ms instead of ~200ms.';
