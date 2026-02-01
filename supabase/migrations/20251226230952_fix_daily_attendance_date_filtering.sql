-- Fix get_daily_attendance to properly retrieve all time entries from previous days
-- The function should show entries where clock_in date matches the requested date
-- Using DATE() function ensures proper date comparison regardless of timezone

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
  scheduled_end TIME
) AS $function$
BEGIN
  -- Check if required tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    RETURN;
  END IF;

  -- Check if scheduled_shifts table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scheduled_shifts')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_entries') THEN
    -- Check which site column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'site_id'
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
        ss.end_time
      FROM profiles p
      LEFT JOIN sites s ON s.id = p.site_id
      LEFT JOIN time_entries te ON te.profile_id = p.id 
        AND DATE(te.clock_in AT TIME ZONE 'UTC') = p_date
      LEFT JOIN scheduled_shifts ss ON ss.profile_id = p.id AND ss.shift_date = p_date
      WHERE p.company_id = p_company_id
        AND (p.status = 'active' OR p.status IS NULL)
      ORDER BY p.full_name;
    ELSIF EXISTS (
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
        ss.end_time
      FROM profiles p
      LEFT JOIN sites s ON s.id = p.home_site
      LEFT JOIN time_entries te ON te.profile_id = p.id 
        AND DATE(te.clock_in AT TIME ZONE 'UTC') = p_date
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
        NULL::TEXT,
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
        ss.end_time
      FROM profiles p
      LEFT JOIN time_entries te ON te.profile_id = p.id 
        AND DATE(te.clock_in AT TIME ZONE 'UTC') = p_date
      LEFT JOIN scheduled_shifts ss ON ss.profile_id = p.id AND ss.shift_date = p_date
      WHERE p.company_id = p_company_id
        AND (p.status = 'active' OR p.status IS NULL)
      ORDER BY p.full_name;
    END IF;
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_entries') THEN
    -- Return without scheduled_shifts data
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'site_id'
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
        NULL::TIME
      FROM profiles p
      LEFT JOIN sites s ON s.id = p.site_id
      LEFT JOIN time_entries te ON te.profile_id = p.id 
        AND DATE(te.clock_in AT TIME ZONE 'UTC') = p_date
      WHERE p.company_id = p_company_id
        AND (p.status = 'active' OR p.status IS NULL)
      ORDER BY p.full_name;
    ELSIF EXISTS (
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
        NULL::TIME
      FROM profiles p
      LEFT JOIN sites s ON s.id = p.home_site
      LEFT JOIN time_entries te ON te.profile_id = p.id 
        AND DATE(te.clock_in AT TIME ZONE 'UTC') = p_date
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
        NULL::TIME
      FROM profiles p
      LEFT JOIN time_entries te ON te.profile_id = p.id 
        AND DATE(te.clock_in AT TIME ZONE 'UTC') = p_date
      WHERE p.company_id = p_company_id
        AND (p.status = 'active' OR p.status IS NULL)
      ORDER BY p.full_name;
    END IF;
  ELSE
    -- Return profiles only (no time entries)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'site_id'
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
        NULL::TIME
      FROM profiles p
      LEFT JOIN sites s ON s.id = p.site_id
      WHERE p.company_id = p_company_id
        AND (p.status = 'active' OR p.status IS NULL)
      ORDER BY p.full_name;
    ELSIF EXISTS (
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
        NULL::TIME
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
        NULL::TIME
      FROM profiles p
      WHERE p.company_id = p_company_id
        AND (p.status = 'active' OR p.status IS NULL)
      ORDER BY p.full_name;
    END IF;
  END IF;
END;
$function$ LANGUAGE plpgsql;

-- Also fix get_weekly_hours to ensure proper date filtering
CREATE OR REPLACE FUNCTION get_weekly_hours(
  p_company_id UUID,
  p_week_start DATE
)
RETURNS TABLE (
  profile_id UUID,
  employee_name TEXT,
  mon_hours DECIMAL,
  tue_hours DECIMAL,
  wed_hours DECIMAL,
  thu_hours DECIMAL,
  fri_hours DECIMAL,
  sat_hours DECIMAL,
  sun_hours DECIMAL,
  total_hours DECIMAL,
  overtime_hours DECIMAL
) AS $function$
BEGIN
  -- Check if required tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    RETURN;
  END IF;

  -- Check if time_entries table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_entries') THEN
    RETURN QUERY
    SELECT 
      p.id,
      p.full_name,
      COALESCE(SUM(CASE WHEN EXTRACT(DOW FROM te.clock_in AT TIME ZONE 'UTC') = 1 THEN te.net_hours END), 0),
      COALESCE(SUM(CASE WHEN EXTRACT(DOW FROM te.clock_in AT TIME ZONE 'UTC') = 2 THEN te.net_hours END), 0),
      COALESCE(SUM(CASE WHEN EXTRACT(DOW FROM te.clock_in AT TIME ZONE 'UTC') = 3 THEN te.net_hours END), 0),
      COALESCE(SUM(CASE WHEN EXTRACT(DOW FROM te.clock_in AT TIME ZONE 'UTC') = 4 THEN te.net_hours END), 0),
      COALESCE(SUM(CASE WHEN EXTRACT(DOW FROM te.clock_in AT TIME ZONE 'UTC') = 5 THEN te.net_hours END), 0),
      COALESCE(SUM(CASE WHEN EXTRACT(DOW FROM te.clock_in AT TIME ZONE 'UTC') = 6 THEN te.net_hours END), 0),
      COALESCE(SUM(CASE WHEN EXTRACT(DOW FROM te.clock_in AT TIME ZONE 'UTC') = 0 THEN te.net_hours END), 0),
      COALESCE(SUM(te.net_hours), 0),
      COALESCE(SUM(te.overtime_hours), 0)
    FROM profiles p
    LEFT JOIN time_entries te ON te.profile_id = p.id 
      AND DATE(te.clock_in AT TIME ZONE 'UTC') >= p_week_start 
      AND DATE(te.clock_in AT TIME ZONE 'UTC') < p_week_start + 7
      AND te.status IN ('completed', 'approved')
    WHERE p.company_id = p_company_id
      AND (p.status = 'active' OR p.status IS NULL)
    GROUP BY p.id, p.full_name
    ORDER BY p.full_name;
  ELSE
    -- Return profiles only (no time entries)
    RETURN QUERY
    SELECT 
      p.id,
      p.full_name,
      0::DECIMAL,
      0::DECIMAL,
      0::DECIMAL,
      0::DECIMAL,
      0::DECIMAL,
      0::DECIMAL,
      0::DECIMAL,
      0::DECIMAL,
      0::DECIMAL
    FROM profiles p
    WHERE p.company_id = p_company_id
      AND (p.status = 'active' OR p.status IS NULL)
    ORDER BY p.full_name;
  END IF;
END;
$function$ LANGUAGE plpgsql;

