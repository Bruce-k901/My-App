-- =====================================================
-- SCHEDULED SHIFTS TABLE
-- Individual shift assignments
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    CREATE TABLE IF NOT EXISTS scheduled_shifts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      site_id UUID NOT NULL,
      profile_id UUID NOT NULL,
      
      -- Shift pattern reference (optional - can be custom)
      shift_pattern_id UUID,
      
      -- Date and times
      shift_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      
      -- Break
      break_duration_minutes INTEGER DEFAULT 0,
      
      -- Calculated hours
      scheduled_hours DECIMAL(4,2),
      
      -- Position/role for this shift
      role TEXT,
      section TEXT,
      
      -- Status workflow
      status TEXT NOT NULL DEFAULT 'scheduled',
      -- Values: 'draft', 'scheduled', 'confirmed', 'completed', 'no_show', 'cancelled'
      
      -- Publishing
      is_published BOOLEAN DEFAULT false,
      published_at TIMESTAMPTZ,
      published_by UUID,
      
      -- Confirmation
      confirmed_at TIMESTAMPTZ,
      
      -- Actual attendance (linked to staff_attendance if exists)
      actual_start TIMESTAMPTZ,
      actual_end TIMESTAMPTZ,
      actual_hours DECIMAL(4,2),
      
      -- Notes
      notes TEXT,
      manager_notes TEXT,
      
      -- Pay modifiers
      is_premium BOOLEAN DEFAULT false,
      premium_reason TEXT,
      
      -- Audit
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      
      CONSTRAINT valid_shift_times CHECK (
        (end_time > start_time) OR (end_time < start_time)
      ),
      CONSTRAINT valid_status CHECK (
        status IN ('draft', 'scheduled', 'confirmed', 'completed', 'no_show', 'cancelled')
      )
    );

    -- Add foreign key constraints
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'scheduled_shifts' 
      AND constraint_name LIKE '%company_id%'
    ) THEN
      ALTER TABLE scheduled_shifts 
      ADD CONSTRAINT scheduled_shifts_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'scheduled_shifts' 
      AND constraint_name LIKE '%site_id%'
    ) THEN
      ALTER TABLE scheduled_shifts 
      ADD CONSTRAINT scheduled_shifts_site_id_fkey 
      FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'scheduled_shifts' 
      AND constraint_name LIKE '%profile_id%'
    ) THEN
      ALTER TABLE scheduled_shifts 
      ADD CONSTRAINT scheduled_shifts_profile_id_fkey 
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    -- Only add shift_pattern_id foreign key if shift_patterns table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shift_patterns') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'scheduled_shifts' 
        AND constraint_name LIKE '%shift_pattern_id%'
      ) THEN
        ALTER TABLE scheduled_shifts 
        ADD CONSTRAINT scheduled_shifts_shift_pattern_id_fkey 
        FOREIGN KEY (shift_pattern_id) REFERENCES shift_patterns(id);
      END IF;
    END IF;

    -- Add foreign keys for profile references
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'scheduled_shifts' 
      AND constraint_name LIKE '%published_by%'
    ) THEN
      ALTER TABLE scheduled_shifts 
      ADD CONSTRAINT scheduled_shifts_published_by_fkey 
      FOREIGN KEY (published_by) REFERENCES profiles(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'scheduled_shifts' 
      AND constraint_name LIKE '%created_by%'
    ) THEN
      ALTER TABLE scheduled_shifts 
      ADD CONSTRAINT scheduled_shifts_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES profiles(id);
    END IF;

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_company ON scheduled_shifts(company_id);
    CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_site ON scheduled_shifts(site_id);
    CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_profile ON scheduled_shifts(profile_id);
    CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_date ON scheduled_shifts(shift_date);
    CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_week ON scheduled_shifts(site_id, shift_date);
    CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_published ON scheduled_shifts(site_id, is_published, shift_date);
    CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_status ON scheduled_shifts(status);

    -- Prevent double-booking same person same time
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'scheduled_shifts' 
      AND indexname = 'idx_prevent_double_booking'
    ) THEN
      CREATE UNIQUE INDEX idx_prevent_double_booking 
      ON scheduled_shifts(profile_id, shift_date, start_time)
      WHERE status NOT IN ('cancelled');
    END IF;

    -- RLS
    ALTER TABLE scheduled_shifts ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "view_own_shifts" ON scheduled_shifts;
    DROP POLICY IF EXISTS "view_site_shifts" ON scheduled_shifts;
    DROP POLICY IF EXISTS "managers_view_all_shifts" ON scheduled_shifts;
    DROP POLICY IF EXISTS "managers_manage_shifts" ON scheduled_shifts;

    -- Staff can view their own published shifts
    CREATE POLICY "view_own_shifts"
    ON scheduled_shifts FOR SELECT
    USING (
      profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
      AND is_published = true
    );

    -- Staff can view published shifts at their site
    CREATE POLICY "view_site_shifts"
    ON scheduled_shifts FOR SELECT
    USING (
      is_published = true
      AND site_id IN (SELECT site_id FROM profiles WHERE auth_user_id = auth.uid())
    );

    -- Managers can view all shifts in their company
    CREATE POLICY "managers_view_all_shifts"
    ON scheduled_shifts FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role) IN ('admin', 'owner', 'manager')
      )
    );

    -- Managers can manage shifts
    CREATE POLICY "managers_manage_shifts"
    ON scheduled_shifts FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role) IN ('admin', 'owner', 'manager')
      )
    );

    -- =====================================================
    -- HELPER FUNCTIONS
    -- =====================================================

    -- Calculate scheduled hours
    CREATE OR REPLACE FUNCTION calculate_shift_hours(
      p_start_time TIME,
      p_end_time TIME,
      p_break_minutes INTEGER DEFAULT 0
    )
    RETURNS DECIMAL AS $function$
    DECLARE
      v_hours DECIMAL;
    BEGIN
      IF p_end_time > p_start_time THEN
        v_hours := EXTRACT(EPOCH FROM (p_end_time - p_start_time)) / 3600;
      ELSE
        v_hours := EXTRACT(EPOCH FROM (p_end_time + INTERVAL '24 hours' - p_start_time)) / 3600;
      END IF;
      
      v_hours := v_hours - (p_break_minutes::DECIMAL / 60);
      
      RETURN ROUND(v_hours, 2);
    END;
    $function$ LANGUAGE plpgsql;

    -- Auto-calculate hours on insert/update
    CREATE OR REPLACE FUNCTION auto_calculate_shift_hours()
    RETURNS TRIGGER AS $function$
    BEGIN
      NEW.scheduled_hours := calculate_shift_hours(NEW.start_time, NEW.end_time, NEW.break_duration_minutes);
      NEW.updated_at := now();
      RETURN NEW;
    END;
    $function$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_calculate_shift_hours ON scheduled_shifts;
    CREATE TRIGGER trigger_calculate_shift_hours
      BEFORE INSERT OR UPDATE ON scheduled_shifts
      FOR EACH ROW
      EXECUTE FUNCTION auto_calculate_shift_hours();

    -- Get shifts for a week
    CREATE OR REPLACE FUNCTION get_week_shifts(
      p_site_id UUID,
      p_week_start DATE
    )
    RETURNS TABLE (
      shift_id UUID,
      profile_id UUID,
      full_name TEXT,
      avatar_url TEXT,
      shift_date DATE,
      start_time TIME,
      end_time TIME,
      scheduled_hours DECIMAL,
      role TEXT,
      status TEXT,
      is_published BOOLEAN,
      pattern_name TEXT,
      pattern_color TEXT
    ) AS $function$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scheduled_shifts')
         AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        RETURN QUERY
        SELECT 
          ss.id,
          ss.profile_id,
          p.full_name,
          p.avatar_url,
          ss.shift_date,
          ss.start_time,
          ss.end_time,
          ss.scheduled_hours,
          ss.role,
          ss.status,
          ss.is_published,
          CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shift_patterns')
            THEN (SELECT name FROM shift_patterns WHERE id = ss.shift_pattern_id)
            ELSE NULL
          END::TEXT,
          CASE 
            WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shift_patterns')
            THEN (SELECT color FROM shift_patterns WHERE id = ss.shift_pattern_id)
            ELSE NULL
          END::TEXT
        FROM scheduled_shifts ss
        JOIN profiles p ON p.id = ss.profile_id
        WHERE ss.site_id = p_site_id
          AND ss.shift_date >= p_week_start
          AND ss.shift_date < p_week_start + 7
          AND ss.status != 'cancelled'
        ORDER BY ss.shift_date, ss.start_time, p.full_name;
      END IF;
    END;
    $function$ LANGUAGE plpgsql;

    RAISE NOTICE 'Created scheduled_shifts table with functions and triggers';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, sites, profiles) do not exist yet - skipping scheduled_shifts table creation';
  END IF;
END $$;

