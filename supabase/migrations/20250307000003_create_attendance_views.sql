-- =====================================================
-- TIME ENTRIES VIEW
-- =====================================================

-- Create view - will work even if scheduled_shifts doesn't exist
-- The LEFT JOIN will simply return NULL if table doesn't exist
DO $$
BEGIN
  -- Only create view if time_entries and profiles tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_entries')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    
    -- Try to create view with scheduled_shifts join
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scheduled_shifts') THEN
      EXECUTE '
      CREATE OR REPLACE VIEW time_entries_view AS
      SELECT 
        te.id as entry_id,
        te.company_id,
        te.profile_id,
        te.site_id,
        te.scheduled_shift_id,
        te.entry_type,
        te.clock_in,
        te.clock_out,
        te.total_break_minutes,
        te.gross_hours,
        te.net_hours,
        te.regular_hours,
        te.overtime_hours,
        te.status,
        te.notes,
        te.employee_notes,
        te.manager_notes,
        te.location_verified,
        DATE(te.clock_in) as work_date,
        p.full_name as employee_name,
        p.email as employee_email,
        p.avatar_url as employee_avatar,
        p.position_title,
        s.name as site_name,
        ss.start_time as scheduled_start,
        ss.end_time as scheduled_end,
        CASE 
          WHEN ss.start_time IS NOT NULL 
            AND te.clock_in > (DATE(te.clock_in) + ss.start_time + INTERVAL ''5 minutes'')
          THEN true
          ELSE false
        END as was_late,
        CASE 
          WHEN ss.end_time IS NOT NULL 
            AND te.clock_out IS NOT NULL
            AND te.clock_out < (DATE(te.clock_in) + ss.end_time - INTERVAL ''5 minutes'')
          THEN true
          ELSE false
        END as left_early
      FROM time_entries te
      JOIN profiles p ON p.id = te.profile_id
      LEFT JOIN sites s ON s.id = te.site_id
      LEFT JOIN scheduled_shifts ss ON ss.id = te.scheduled_shift_id';
    ELSE
      -- Create view without scheduled_shifts join
      EXECUTE '
      CREATE OR REPLACE VIEW time_entries_view AS
      SELECT 
        te.id as entry_id,
        te.company_id,
        te.profile_id,
        te.site_id,
        te.scheduled_shift_id,
        te.entry_type,
        te.clock_in,
        te.clock_out,
        te.total_break_minutes,
        te.gross_hours,
        te.net_hours,
        te.regular_hours,
        te.overtime_hours,
        te.status,
        te.notes,
        te.employee_notes,
        te.manager_notes,
        te.location_verified,
        DATE(te.clock_in) as work_date,
        p.full_name as employee_name,
        p.email as employee_email,
        p.avatar_url as employee_avatar,
        p.position_title,
        s.name as site_name,
        NULL::TIME as scheduled_start,
        NULL::TIME as scheduled_end,
        false as was_late,
        false as left_early
      FROM time_entries te
      JOIN profiles p ON p.id = te.profile_id
      LEFT JOIN sites s ON s.id = te.site_id';
    END IF;

    GRANT SELECT ON time_entries_view TO authenticated;
    RAISE NOTICE 'Created time_entries_view';
  ELSE
    RAISE NOTICE '⚠️ Required tables (time_entries, profiles) do not exist yet - skipping time_entries_view creation';
  END IF;
END $$;

-- =====================================================
-- TIMESHEETS VIEW
-- =====================================================

DO $$
BEGIN
  -- Only create view if timesheets and profiles tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'timesheets')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    
    -- Check if sites table exists for the JOIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN
      -- Check for home_site or site_id column
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'home_site'
      ) THEN
        EXECUTE '
        CREATE OR REPLACE VIEW timesheets_view AS
        SELECT 
          ts.id as timesheet_id,
          ts.company_id,
          ts.profile_id,
          ts.period_start,
          ts.period_end,
          ts.total_hours,
          ts.regular_hours,
          ts.overtime_hours,
          ts.break_hours,
          ts.days_worked,
          ts.status,
          ts.submitted_at,
          ts.approved_at,
          ts.rejection_reason,
          p.full_name as employee_name,
          p.email as employee_email,
          p.avatar_url as employee_avatar,
          p.position_title,
          p.home_site,
          s.name as site_name,
          a.full_name as approved_by_name
        FROM timesheets ts
        JOIN profiles p ON p.id = ts.profile_id
        LEFT JOIN sites s ON s.id = p.home_site
        LEFT JOIN profiles a ON a.id = ts.approved_by';
      ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'site_id'
      ) THEN
        EXECUTE '
        CREATE OR REPLACE VIEW timesheets_view AS
        SELECT 
          ts.id as timesheet_id,
          ts.company_id,
          ts.profile_id,
          ts.period_start,
          ts.period_end,
          ts.total_hours,
          ts.regular_hours,
          ts.overtime_hours,
          ts.break_hours,
          ts.days_worked,
          ts.status,
          ts.submitted_at,
          ts.approved_at,
          ts.rejection_reason,
          p.full_name as employee_name,
          p.email as employee_email,
          p.avatar_url as employee_avatar,
          p.position_title,
          p.site_id as home_site,
          s.name as site_name,
          a.full_name as approved_by_name
        FROM timesheets ts
        JOIN profiles p ON p.id = ts.profile_id
        LEFT JOIN sites s ON s.id = p.site_id
        LEFT JOIN profiles a ON a.id = ts.approved_by';
      ELSE
        EXECUTE '
        CREATE OR REPLACE VIEW timesheets_view AS
        SELECT 
          ts.id as timesheet_id,
          ts.company_id,
          ts.profile_id,
          ts.period_start,
          ts.period_end,
          ts.total_hours,
          ts.regular_hours,
          ts.overtime_hours,
          ts.break_hours,
          ts.days_worked,
          ts.status,
          ts.submitted_at,
          ts.approved_at,
          ts.rejection_reason,
          p.full_name as employee_name,
          p.email as employee_email,
          p.avatar_url as employee_avatar,
          p.position_title,
          NULL::UUID as home_site,
          NULL::TEXT as site_name,
          a.full_name as approved_by_name
        FROM timesheets ts
        JOIN profiles p ON p.id = ts.profile_id
        LEFT JOIN profiles a ON a.id = ts.approved_by';
      END IF;
    ELSE
      EXECUTE '
      CREATE OR REPLACE VIEW timesheets_view AS
      SELECT 
        ts.id as timesheet_id,
        ts.company_id,
        ts.profile_id,
        ts.period_start,
        ts.period_end,
        ts.total_hours,
        ts.regular_hours,
        ts.overtime_hours,
        ts.break_hours,
        ts.days_worked,
        ts.status,
        ts.submitted_at,
        ts.approved_at,
        ts.rejection_reason,
        p.full_name as employee_name,
        p.email as employee_email,
        p.avatar_url as employee_avatar,
        p.position_title,
        NULL::UUID as home_site,
        NULL::TEXT as site_name,
        a.full_name as approved_by_name
      FROM timesheets ts
      JOIN profiles p ON p.id = ts.profile_id
      LEFT JOIN profiles a ON a.id = ts.approved_by';
    END IF;

    GRANT SELECT ON timesheets_view TO authenticated;
    RAISE NOTICE 'Created timesheets_view';
  ELSE
    RAISE NOTICE '⚠️ Required tables (timesheets, profiles) do not exist yet - skipping timesheets_view creation';
  END IF;
END $$;

-- =====================================================
-- DAILY ATTENDANCE SUMMARY
-- =====================================================

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
      LEFT JOIN time_entries te ON te.profile_id = p.id AND DATE(te.clock_in) = p_date
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
      LEFT JOIN time_entries te ON te.profile_id = p.id AND DATE(te.clock_in) = p_date
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
      LEFT JOIN time_entries te ON te.profile_id = p.id AND DATE(te.clock_in) = p_date
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
        NULL::TIME
      FROM profiles p
      LEFT JOIN time_entries te ON te.profile_id = p.id AND DATE(te.clock_in) = p_date
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

-- =====================================================
-- WEEKLY HOURS SUMMARY
-- =====================================================

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
      COALESCE(SUM(CASE WHEN EXTRACT(DOW FROM te.clock_in) = 1 THEN te.net_hours END), 0),
      COALESCE(SUM(CASE WHEN EXTRACT(DOW FROM te.clock_in) = 2 THEN te.net_hours END), 0),
      COALESCE(SUM(CASE WHEN EXTRACT(DOW FROM te.clock_in) = 3 THEN te.net_hours END), 0),
      COALESCE(SUM(CASE WHEN EXTRACT(DOW FROM te.clock_in) = 4 THEN te.net_hours END), 0),
      COALESCE(SUM(CASE WHEN EXTRACT(DOW FROM te.clock_in) = 5 THEN te.net_hours END), 0),
      COALESCE(SUM(CASE WHEN EXTRACT(DOW FROM te.clock_in) = 6 THEN te.net_hours END), 0),
      COALESCE(SUM(CASE WHEN EXTRACT(DOW FROM te.clock_in) = 0 THEN te.net_hours END), 0),
      COALESCE(SUM(te.net_hours), 0),
      COALESCE(SUM(te.overtime_hours), 0)
    FROM profiles p
    LEFT JOIN time_entries te ON te.profile_id = p.id 
      AND DATE(te.clock_in) >= p_week_start 
      AND DATE(te.clock_in) < p_week_start + 7
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

