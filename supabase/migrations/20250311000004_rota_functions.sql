-- =============================================
-- ROTA BUILDER FUNCTIONS
-- Core operations for the rota builder UI
-- =============================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rotas') THEN

    -- Get or create rota for a week
    CREATE OR REPLACE FUNCTION get_or_create_rota(
  p_site_id UUID,
  p_week_starting DATE
)
RETURNS UUID AS $func$
DECLARE
  v_rota_id UUID;
  v_company_id UUID;
  v_monday DATE;
BEGIN
  -- Normalize to Monday
  v_monday := p_week_starting - EXTRACT(DOW FROM p_week_starting)::INTEGER + 1;
  IF EXTRACT(DOW FROM p_week_starting) = 0 THEN
    v_monday := p_week_starting - 6;
  END IF;
  
  -- Get company
  SELECT company_id INTO v_company_id FROM sites WHERE id = p_site_id;
  
  -- Try to find existing
  SELECT id INTO v_rota_id FROM rotas 
  WHERE site_id = p_site_id AND week_starting = v_monday;
  
  -- Create if not exists
  IF v_rota_id IS NULL THEN
    INSERT INTO rotas (company_id, site_id, week_starting, created_by)
    VALUES (v_company_id, p_site_id, v_monday, auth.uid())
    RETURNING id INTO v_rota_id;
  END IF;
  
  RETURN v_rota_id;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Get full rota with all data
    CREATE OR REPLACE FUNCTION get_rota_with_shifts(p_rota_id UUID)
    RETURNS TABLE (
      rota JSONB,
      shifts JSONB,
      staff JSONB,
      forecast JSONB
    ) AS $func$
DECLARE
  v_rota RECORD;
BEGIN
  SELECT * INTO v_rota FROM rotas WHERE id = p_rota_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rota not found: %', p_rota_id;
  END IF;
  
  RETURN QUERY SELECT
    -- Rota details
    to_jsonb(v_rota),
    
    -- All shifts
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', rs.id,
          'profile_id', rs.profile_id,
          'profile_name', p.full_name,
          'profile_avatar', p.avatar_url,
          'shift_date', rs.shift_date::TEXT,
          'start_time', rs.start_time::TEXT,
          'end_time', rs.end_time::TEXT,
          'break_minutes', rs.break_minutes,
          'gross_hours', rs.gross_hours,
          'net_hours', rs.net_hours,
          'role_required', rs.role_required,
          'hourly_rate', rs.hourly_rate,
          'estimated_cost', rs.estimated_cost,
          'status', rs.status,
          'color', rs.color,
          'notes', rs.notes
        ) ORDER BY rs.shift_date, rs.start_time
      )
      FROM rota_shifts rs
      LEFT JOIN profiles p ON p.id = rs.profile_id
      WHERE rs.rota_id = p_rota_id
    ), '[]'::jsonb),
    
    -- Available staff
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', s.id,
          'full_name', s.full_name,
          'position_title', s.position_title,
          'avatar_url', s.avatar_url,
          'contracted_hours', s.contracted_hours,
          'min_hours', s.min_hours,
          'max_hours', s.max_hours,
          'hourly_rate', s.hourly_rate,
          'skills', s.skills,
          'is_ready', s.is_ready,
          'missing_items', s.missing_items
        )
      )
      FROM get_schedulable_staff(v_rota.company_id, v_rota.site_id) s
    ), '[]'::jsonb),
    
    -- Weekly forecast
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'date', d::DATE::TEXT,
          'forecast', (SELECT row_to_json(f) FROM get_staffing_forecast(v_rota.site_id, d::DATE) f)
        )
      )
      FROM generate_series(
        v_rota.week_starting, 
        v_rota.week_starting + INTERVAL '6 days', 
        INTERVAL '1 day'
      ) d
    ), '[]'::jsonb);
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Add shift to rota
    CREATE OR REPLACE FUNCTION add_rota_shift(
      p_rota_id UUID,
      p_profile_id UUID,
      p_shift_date DATE,
      p_start_time TIME,
      p_end_time TIME,
      p_break_minutes INTEGER DEFAULT 0,
      p_role_required TEXT DEFAULT NULL,
      p_color TEXT DEFAULT '#6366f1'
    )
    RETURNS UUID AS $func$
DECLARE
  v_shift_id UUID;
  v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id FROM rotas WHERE id = p_rota_id;
  
  INSERT INTO rota_shifts (
    rota_id, company_id, profile_id, shift_date,
    start_time, end_time, break_minutes, role_required, color
  ) VALUES (
    p_rota_id, v_company_id, p_profile_id, p_shift_date,
    p_start_time, p_end_time, p_break_minutes, p_role_required, p_color
  )
  RETURNING id INTO v_shift_id;
  
  RETURN v_shift_id;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Assign staff to shift
    CREATE OR REPLACE FUNCTION assign_shift(
      p_shift_id UUID,
      p_profile_id UUID
    )
    RETURNS JSONB AS $func$
DECLARE
  v_shift RECORD;
  v_conflicts JSONB;
BEGIN
  SELECT * INTO v_shift FROM rota_shifts WHERE id = p_shift_id;
  
  -- Check for conflicts
  SELECT jsonb_agg(
    jsonb_build_object(
      'type', 'overlap',
      'shift_id', rs.id,
      'date', rs.shift_date,
      'time', rs.start_time || '-' || rs.end_time
    )
  ) INTO v_conflicts
  FROM rota_shifts rs
  WHERE rs.profile_id = p_profile_id
    AND rs.shift_date = v_shift.shift_date
    AND rs.id != p_shift_id
    AND rs.status != 'cancelled'
    AND (
      (rs.start_time, rs.end_time) OVERLAPS (v_shift.start_time, v_shift.end_time)
    );
  
  -- Check leave (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_requests') THEN
    IF EXISTS(
      SELECT 1 FROM leave_requests lr
      WHERE lr.profile_id = p_profile_id
        AND lr.status = 'approved'
        AND v_shift.shift_date BETWEEN lr.start_date AND lr.end_date
    ) THEN
      v_conflicts := COALESCE(v_conflicts, '[]'::jsonb) || 
        jsonb_build_object('type', 'leave', 'date', v_shift.shift_date);
    END IF;
  END IF;
  
  -- Check availability (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_working_patterns') THEN
    IF NOT EXISTS(
      SELECT 1 FROM staff_working_patterns swp
      WHERE swp.profile_id = p_profile_id
        AND swp.day_of_week = EXTRACT(DOW FROM v_shift.shift_date)
        AND swp.is_available = true
    ) THEN
      v_conflicts := COALESCE(v_conflicts, '[]'::jsonb) || 
        jsonb_build_object('type', 'unavailable', 'date', v_shift.shift_date);
    END IF;
  END IF;
  
  -- Assign anyway (manager override) but return conflicts
  UPDATE rota_shifts SET profile_id = p_profile_id WHERE id = p_shift_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'conflicts', COALESCE(v_conflicts, '[]'::jsonb)
  );
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Unassign shift
    CREATE OR REPLACE FUNCTION unassign_shift(p_shift_id UUID)
    RETURNS void AS $func$
BEGIN
  UPDATE rota_shifts SET profile_id = NULL WHERE id = p_shift_id;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Copy shifts from another week
    CREATE OR REPLACE FUNCTION copy_rota_from_week(
      p_target_rota_id UUID,
      p_source_week_starting DATE
    )
    RETURNS INTEGER AS $func$
DECLARE
  v_target RECORD;
  v_source_rota_id UUID;
  v_count INTEGER := 0;
BEGIN
  SELECT * INTO v_target FROM rotas WHERE id = p_target_rota_id;
  
  -- Find source rota
  SELECT id INTO v_source_rota_id FROM rotas
  WHERE site_id = v_target.site_id AND week_starting = p_source_week_starting;
  
  IF v_source_rota_id IS NULL THEN
    RAISE EXCEPTION 'No rota found for source week';
  END IF;
  
  -- Copy shifts (adjusting dates)
  INSERT INTO rota_shifts (
    rota_id, company_id, profile_id, shift_date,
    start_time, end_time, break_minutes, role_required, color
  )
  SELECT 
    p_target_rota_id,
    v_target.company_id,
    profile_id,
    shift_date + (v_target.week_starting - p_source_week_starting),
    start_time,
    end_time,
    break_minutes,
    role_required,
    color
  FROM rota_shifts
  WHERE rota_id = v_source_rota_id
    AND status != 'cancelled';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Apply template to rota
    CREATE OR REPLACE FUNCTION apply_rota_template(
      p_rota_id UUID,
      p_template_id UUID
    )
    RETURNS INTEGER AS $func$
DECLARE
  v_rota RECORD;
  v_count INTEGER := 0;
BEGIN
  SELECT * INTO v_rota FROM rotas WHERE id = p_rota_id;
  
  INSERT INTO rota_shifts (
    rota_id, company_id, shift_date,
    start_time, end_time, break_minutes, role_required, color
  )
  SELECT 
    p_rota_id,
    v_rota.company_id,
    v_rota.week_starting + rts.day_of_week - 1,
    rts.start_time,
    rts.end_time,
    rts.break_minutes,
    rts.role_required,
    rts.color
  FROM rota_template_shifts rts
  CROSS JOIN generate_series(1, rts.quantity) n
  WHERE rts.template_id = p_template_id;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Publish rota
    CREATE OR REPLACE FUNCTION publish_rota(p_rota_id UUID)
    RETURNS void AS $func$
BEGIN
  UPDATE rotas SET 
    status = 'published',
    published_at = NOW(),
    published_by = auth.uid()
  WHERE id = p_rota_id;
  
  -- TODO: Trigger notifications to staff
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Get staff hours for the week
    CREATE OR REPLACE FUNCTION get_staff_weekly_hours(
      p_rota_id UUID
    )
    RETURNS TABLE (
      profile_id UUID,
      full_name TEXT,
      contracted_hours DECIMAL,
      scheduled_hours DECIMAL,
      hours_difference DECIMAL,
      estimated_cost INTEGER,
      shift_count INTEGER
    ) AS $func$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.contracted_hours_per_week,
    COALESCE(SUM(rs.net_hours), 0)::DECIMAL,
    COALESCE(SUM(rs.net_hours), 0) - COALESCE(p.contracted_hours_per_week, 0),
    COALESCE(SUM(rs.estimated_cost), 0)::INTEGER,
    COUNT(rs.id)::INTEGER
  FROM profiles p
  LEFT JOIN rota_shifts rs ON rs.profile_id = p.id 
    AND rs.rota_id = p_rota_id 
    AND rs.status != 'cancelled'
  WHERE p.company_id = (SELECT company_id FROM rotas WHERE id = p_rota_id)
    AND p.status = 'active'
  GROUP BY p.id, p.full_name, p.contracted_hours_per_week
  HAVING COUNT(rs.id) > 0
  ORDER BY p.full_name;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

    RAISE NOTICE 'Created rota builder functions';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, profiles, sites, rotas) do not exist yet - skipping rota functions';
  END IF;
END $$;

