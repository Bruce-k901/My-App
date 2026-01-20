-- =====================================================
-- STAFFING REQUIREMENTS TABLE
-- Minimum staffing levels per time slot
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    CREATE TABLE IF NOT EXISTS staffing_requirements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      site_id UUID NOT NULL,
      
      day_of_week INTEGER NOT NULL,
      time_slot_start TIME NOT NULL,
      time_slot_end TIME NOT NULL,
      
      -- Requirements
      minimum_staff INTEGER NOT NULL DEFAULT 1,
      ideal_staff INTEGER,
      maximum_staff INTEGER,
      
      -- Role-specific requirements
      role_requirements JSONB,
      
      -- Validity period
      effective_from DATE,
      effective_to DATE,
      
      created_at TIMESTAMPTZ DEFAULT now()
    );

    -- Add foreign key constraints
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'staffing_requirements' 
      AND constraint_name LIKE '%company_id%'
    ) THEN
      ALTER TABLE staffing_requirements 
      ADD CONSTRAINT staffing_requirements_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'staffing_requirements' 
      AND constraint_name LIKE '%site_id%'
    ) THEN
      ALTER TABLE staffing_requirements 
      ADD CONSTRAINT staffing_requirements_site_id_fkey 
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS idx_staffing_requirements_site ON staffing_requirements(site_id);
    CREATE INDEX IF NOT EXISTS idx_staffing_requirements_day ON staffing_requirements(site_id, day_of_week);

    -- RLS
    ALTER TABLE staffing_requirements ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "view_requirements" ON staffing_requirements;
    DROP POLICY IF EXISTS "manage_requirements" ON staffing_requirements;

    CREATE POLICY "view_requirements"
    ON staffing_requirements FOR SELECT
    USING (
      company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid())
    );

    CREATE POLICY "manage_requirements"
    ON staffing_requirements FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role) IN ('admin', 'owner', 'manager')
      )
    );

    -- =====================================================
    -- ROTA VIEW
    -- =====================================================

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scheduled_shifts') THEN
      CREATE OR REPLACE VIEW rota_view AS
      SELECT 
        ss.id as shift_id,
        ss.company_id,
        ss.site_id,
        ss.profile_id,
        ss.shift_date,
        ss.start_time,
        ss.end_time,
        ss.scheduled_hours,
        ss.break_duration_minutes,
        ss.role,
        ss.section,
        ss.status,
        ss.is_published,
        ss.confirmed_at,
        ss.notes,
        ss.is_premium,
        p.full_name,
        p.email,
        p.avatar_url,
        p.position_title,
        s.name as site_name,
        CASE 
          WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shift_patterns')
          THEN (SELECT name FROM shift_patterns WHERE id = ss.shift_pattern_id)
          ELSE NULL
        END as pattern_name,
        CASE 
          WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shift_patterns')
          THEN (SELECT color FROM shift_patterns WHERE id = ss.shift_pattern_id)
          ELSE NULL
        END as pattern_color,
        CASE 
          WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shift_patterns')
          THEN (SELECT short_code FROM shift_patterns WHERE id = ss.shift_pattern_id)
          ELSE NULL
        END as pattern_code,
        EXTRACT(ISOYEAR FROM ss.shift_date) as year,
        EXTRACT(WEEK FROM ss.shift_date) as week_number,
        DATE_TRUNC('week', ss.shift_date)::DATE as week_start
      FROM scheduled_shifts ss
      JOIN profiles p ON p.id = ss.profile_id
      JOIN sites s ON s.id = ss.site_id
      WHERE ss.status != 'cancelled';

      GRANT SELECT ON rota_view TO authenticated;
    END IF;

    -- =====================================================
    -- STAFF HOURS SUMMARY
    -- =====================================================

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scheduled_shifts') THEN
      CREATE OR REPLACE VIEW staff_hours_summary AS
      SELECT 
        ss.company_id,
        ss.site_id,
        ss.profile_id,
        p.full_name,
        DATE_TRUNC('week', ss.shift_date)::DATE as week_start,
        COUNT(*) as shift_count,
        SUM(ss.scheduled_hours) as scheduled_hours,
        SUM(CASE WHEN ss.status = 'completed' THEN ss.actual_hours ELSE 0 END) as actual_hours,
        SUM(CASE WHEN ss.is_premium THEN ss.scheduled_hours ELSE 0 END) as premium_hours
      FROM scheduled_shifts ss
      JOIN profiles p ON p.id = ss.profile_id
      WHERE ss.status NOT IN ('cancelled', 'draft')
      GROUP BY ss.company_id, ss.site_id, ss.profile_id, p.full_name, DATE_TRUNC('week', ss.shift_date);

      GRANT SELECT ON staff_hours_summary TO authenticated;
    END IF;

    -- =====================================================
    -- COVERAGE CHECK FUNCTION
    -- =====================================================

    CREATE OR REPLACE FUNCTION check_coverage(
      p_site_id UUID,
      p_date DATE
    )
    RETURNS TABLE (
      time_slot_start TIME,
      time_slot_end TIME,
      required_staff INTEGER,
      scheduled_staff INTEGER,
      is_understaffed BOOLEAN,
      shortfall INTEGER
    ) AS $function$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staffing_requirements')
         OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scheduled_shifts') THEN
        RETURN;
      END IF;

      RETURN QUERY
      WITH requirements AS (
        SELECT 
          sr.time_slot_start,
          sr.time_slot_end,
          sr.minimum_staff
        FROM staffing_requirements sr
        WHERE sr.site_id = p_site_id
          AND sr.day_of_week = EXTRACT(DOW FROM p_date)
          AND (sr.effective_from IS NULL OR sr.effective_from <= p_date)
          AND (sr.effective_to IS NULL OR sr.effective_to >= p_date)
      ),
      scheduled AS (
        SELECT 
          ss.start_time,
          ss.end_time
        FROM scheduled_shifts ss
        WHERE ss.site_id = p_site_id
          AND ss.shift_date = p_date
          AND ss.status NOT IN ('cancelled', 'draft')
      )
      SELECT 
        r.time_slot_start,
        r.time_slot_end,
        r.minimum_staff,
        COUNT(s.*)::INTEGER as scheduled_count,
        COUNT(s.*) < r.minimum_staff,
        GREATEST(r.minimum_staff - COUNT(s.*)::INTEGER, 0)
      FROM requirements r
      LEFT JOIN scheduled s ON 
        s.start_time <= r.time_slot_start AND s.end_time >= r.time_slot_end
      GROUP BY r.time_slot_start, r.time_slot_end, r.minimum_staff;
    END;
    $function$ LANGUAGE plpgsql;

    -- =====================================================
    -- PUBLISH ROTA FUNCTION
    -- =====================================================

    CREATE OR REPLACE FUNCTION publish_week_rota(
      p_site_id UUID,
      p_week_start DATE,
      p_published_by UUID
    )
    RETURNS INTEGER AS $function$
    DECLARE
      v_count INTEGER;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scheduled_shifts') THEN
        RETURN 0;
      END IF;

      UPDATE scheduled_shifts
      SET 
        is_published = true,
        published_at = now(),
        published_by = p_published_by,
        status = CASE WHEN status = 'draft' THEN 'scheduled' ELSE status END,
        updated_at = now()
      WHERE site_id = p_site_id
        AND shift_date >= p_week_start
        AND shift_date < p_week_start + 7
        AND is_published = false;
      
      GET DIAGNOSTICS v_count = ROW_COUNT;
      
      RETURN v_count;
    END;
    $function$ LANGUAGE plpgsql;

    RAISE NOTICE 'Created staffing_requirements table, views, and functions';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, sites, profiles) do not exist yet - skipping staffing_requirements table creation';
  END IF;
END $$;

