-- Sync auto clock-out to time_entries table
-- When the cron auto-clocks out a user from staff_attendance, also close their time_entries record.
-- Also update get_daily_attendance to return notes so the UI can show "System Clock Out".

-- 1. Update auto_clock_out_after_closing to also update time_entries
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
  updated_attendance AS (
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
      fu.calc_closing_time,
      fu.clock_in_time
  ),
  -- Also close matching time_entries records
  updated_time_entries AS (
    UPDATE public.time_entries te
    SET
      clock_out = ua.auto_clock_out_time,
      status = 'completed',
      notes = COALESCE(te.notes, '') || E'\n[Auto clocked out 2 hours after site closing time]',
      gross_hours = EXTRACT(EPOCH FROM (ua.auto_clock_out_time - te.clock_in)) / 3600.0,
      net_hours = EXTRACT(EPOCH FROM (ua.auto_clock_out_time - te.clock_in)) / 3600.0 - COALESCE(te.total_break_minutes, 0) / 60.0
    FROM updated_attendance ua
    WHERE te.profile_id = ua.profile_id
      AND te.clock_out IS NULL
      AND te.status = 'active'
      AND DATE(te.clock_in) = DATE(ua.clock_in_time)
    RETURNING te.id
  )
  SELECT
    u.profile_id,
    u.home_site_id,
    u.auto_clock_out_time,
    u.calc_closing_time,
    EXTRACT(EPOCH FROM (v_current_time - u.calc_closing_time)) / 3600.0
  FROM updated_attendance u;

END;
$function$;

COMMENT ON FUNCTION public.auto_clock_out_after_closing() IS
'Auto clocks out users still on shift 2+ hours after their home site closing time.
Updates both staff_attendance and time_entries tables.
Uses profiles.home_site to find each user''s home site.';

GRANT EXECUTE ON FUNCTION public.auto_clock_out_after_closing() TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_clock_out_after_closing() TO authenticated;

-- 2. Update auto_clock_out_old_shifts to also update time_entries
CREATE OR REPLACE FUNCTION public.auto_clock_out_old_shifts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_count INTEGER;
BEGIN
  -- Close staff_attendance records older than 24 hours
  WITH old_shifts AS (
    UPDATE public.staff_attendance
    SET
      clock_out_time = clock_in_time + INTERVAL '24 hours',
      shift_status = 'off_shift',
      total_hours = 24.0,
      shift_notes = COALESCE(shift_notes, '') || E'\n[Auto clocked out after 24 hours]'
    WHERE shift_status = 'on_shift'
      AND clock_out_time IS NULL
      AND clock_in_time < NOW() - INTERVAL '24 hours'
    RETURNING profile_id, clock_in_time
  ),
  -- Also close matching time_entries records
  updated_te AS (
    UPDATE public.time_entries te
    SET
      clock_out = os.clock_in_time + INTERVAL '24 hours',
      status = 'completed',
      notes = COALESCE(te.notes, '') || E'\n[Auto clocked out after 24 hours]',
      gross_hours = 24.0,
      net_hours = 24.0 - COALESCE(te.total_break_minutes, 0) / 60.0
    FROM old_shifts os
    WHERE te.profile_id = os.profile_id
      AND te.clock_out IS NULL
      AND te.status = 'active'
      AND DATE(te.clock_in) = DATE(os.clock_in_time)
    RETURNING te.id
  )
  SELECT COUNT(*) INTO v_count FROM old_shifts;

  RETURN v_count;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.auto_clock_out_old_shifts() TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_clock_out_old_shifts() TO authenticated;

-- 3. Update get_daily_attendance to also return notes from time_entries
-- This allows the UI to detect auto clock outs and show a "System" badge
-- Must DROP first because we're adding a new column to the return type
DROP FUNCTION IF EXISTS get_daily_attendance(UUID, DATE);
CREATE OR REPLACE FUNCTION get_daily_attendance(
  p_company_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  profile_id UUID,
  employee_name TEXT,
  position_title TEXT,
  site_name TEXT,
  status TEXT,
  clock_in TIMESTAMPTZ,
  clock_out TIMESTAMPTZ,
  hours_worked DECIMAL,
  is_late BOOLEAN,
  is_on_break BOOLEAN,
  scheduled_start TIME,
  scheduled_end TIME,
  notes TEXT
) AS $func$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_entries') THEN
    -- With time_entries - check for scheduled_shifts too
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scheduled_shifts') THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'home_site'
      ) THEN
        RETURN QUERY
        SELECT
          p.id,
          p.full_name,
          p.position_title,
          s.name,
          COALESCE(te.status, 'absent')::TEXT,
          te.clock_in,
          te.clock_out,
          te.net_hours,
          CASE
            WHEN ss.start_time IS NOT NULL
              AND te.clock_in IS NOT NULL
              AND te.clock_in > (p_date + ss.start_time + INTERVAL '5 minutes')
            THEN true
            ELSE false
          END,
          COALESCE(te.break_start IS NOT NULL, false),
          ss.start_time,
          ss.end_time,
          te.notes
        FROM profiles p
        LEFT JOIN sites s ON s.id = p.home_site
        LEFT JOIN time_entries te ON te.profile_id = p.id AND DATE(te.clock_in) = p_date
        LEFT JOIN scheduled_shifts ss ON ss.profile_id = p.id AND ss.shift_date = p_date
        WHERE p.company_id = p_company_id
          AND (p.status = 'active' OR p.status IS NULL)
        ORDER BY p.full_name;
      ELSE
        RETURN QUERY
        SELECT
          p.id,
          p.full_name,
          p.position_title,
          COALESCE(s.name, NULL::TEXT),
          COALESCE(te.status, 'absent')::TEXT,
          te.clock_in,
          te.clock_out,
          te.net_hours,
          CASE
            WHEN ss.start_time IS NOT NULL
              AND te.clock_in IS NOT NULL
              AND te.clock_in > (p_date + ss.start_time + INTERVAL '5 minutes')
            THEN true
            ELSE false
          END,
          COALESCE(te.break_start IS NOT NULL, false),
          ss.start_time,
          ss.end_time,
          te.notes
        FROM profiles p
        LEFT JOIN sites s ON s.id = (SELECT p2.home_site FROM profiles p2 WHERE p2.id = p.id)
        LEFT JOIN time_entries te ON te.profile_id = p.id AND DATE(te.clock_in) = p_date
        LEFT JOIN scheduled_shifts ss ON ss.profile_id = p.id AND ss.shift_date = p_date
        WHERE p.company_id = p_company_id
          AND (p.status = 'active' OR p.status IS NULL)
        ORDER BY p.full_name;
      END IF;
    ELSE
      -- No scheduled_shifts table
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'home_site'
      ) THEN
        RETURN QUERY
        SELECT
          p.id,
          p.full_name,
          p.position_title,
          s.name,
          COALESCE(te.status, 'absent')::TEXT,
          te.clock_in,
          te.clock_out,
          te.net_hours,
          false,
          COALESCE(te.break_start IS NOT NULL, false),
          NULL::TIME,
          NULL::TIME,
          te.notes
        FROM profiles p
        LEFT JOIN sites s ON s.id = p.home_site
        LEFT JOIN time_entries te ON te.profile_id = p.id AND DATE(te.clock_in) = p_date
        WHERE p.company_id = p_company_id
          AND (p.status = 'active' OR p.status IS NULL)
        ORDER BY p.full_name;
      ELSE
        RETURN QUERY
        SELECT
          p.id,
          p.full_name,
          p.position_title,
          NULL::TEXT,
          COALESCE(te.status, 'absent')::TEXT,
          te.clock_in,
          te.clock_out,
          te.net_hours,
          false,
          COALESCE(te.break_start IS NOT NULL, false),
          NULL::TIME,
          NULL::TIME,
          te.notes
        FROM profiles p
        LEFT JOIN time_entries te ON te.profile_id = p.id AND DATE(te.clock_in) = p_date
        WHERE p.company_id = p_company_id
          AND (p.status = 'active' OR p.status IS NULL)
        ORDER BY p.full_name;
      END IF;
    END IF;
  ELSE
    -- No time_entries table at all
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'home_site'
    ) THEN
      RETURN QUERY
      SELECT
        p.id,
        p.full_name,
        p.position_title,
        s.name,
        'absent'::TEXT,
        NULL::TIMESTAMPTZ,
        NULL::TIMESTAMPTZ,
        NULL::DECIMAL,
        false,
        false,
        NULL::TIME,
        NULL::TIME,
        NULL::TEXT
      FROM profiles p
      LEFT JOIN sites s ON s.id = p.home_site
      WHERE p.company_id = p_company_id
        AND (p.status = 'active' OR p.status IS NULL)
      ORDER BY p.full_name;
    ELSE
      RETURN QUERY
      SELECT
        p.id,
        p.full_name,
        p.position_title,
        NULL::TEXT,
        'absent'::TEXT,
        NULL::TIMESTAMPTZ,
        NULL::TIMESTAMPTZ,
        NULL::DECIMAL,
        false,
        false,
        NULL::TIME,
        NULL::TIME,
        NULL::TEXT
      FROM profiles p
      WHERE p.company_id = p_company_id
        AND (p.status = 'active' OR p.status IS NULL)
      ORDER BY p.full_name;
    END IF;
  END IF;
END;
$func$ LANGUAGE plpgsql;
