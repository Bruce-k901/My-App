-- =====================================================
-- TIME ENTRIES TABLE
-- Individual clock in/out records
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    CREATE TABLE IF NOT EXISTS time_entries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      profile_id UUID NOT NULL,
      site_id UUID,
      
      -- Linked shift (optional)
      scheduled_shift_id UUID,
      
      -- Entry type
      entry_type TEXT NOT NULL DEFAULT 'shift',
      -- Values: 'shift', 'break', 'overtime', 'adjustment'
      
      -- Times
      clock_in TIMESTAMPTZ NOT NULL,
      clock_out TIMESTAMPTZ,
      
      -- Break tracking
      break_start TIMESTAMPTZ,
      break_end TIMESTAMPTZ,
      total_break_minutes INTEGER DEFAULT 0,
      
      -- Calculated hours
      gross_hours DECIMAL(5,2),
      -- Total time from clock in to clock out
      
      net_hours DECIMAL(5,2),
      -- Gross hours minus breaks
      
      -- Overtime
      regular_hours DECIMAL(5,2),
      overtime_hours DECIMAL(5,2),
      
      -- Status
      status TEXT NOT NULL DEFAULT 'active',
      -- Values: 'active' (clocked in), 'completed', 'approved', 'rejected', 'adjusted'
      
      -- Location verification
      clock_in_location JSONB,
      -- {lat, lng, accuracy, address}
      
      clock_out_location JSONB,
      
      location_verified BOOLEAN DEFAULT false,
      
      -- Notes
      notes TEXT,
      employee_notes TEXT,
      manager_notes TEXT,
      
      -- Adjustments
      adjusted_by UUID,
      adjustment_reason TEXT,
      original_clock_in TIMESTAMPTZ,
      original_clock_out TIMESTAMPTZ,
      
      -- Approval
      approved_by UUID,
      approved_at TIMESTAMPTZ,
      
      -- Audit
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- Add foreign key constraints
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'time_entries' 
      AND constraint_name LIKE '%company_id%'
    ) THEN
      ALTER TABLE time_entries 
      ADD CONSTRAINT time_entries_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'time_entries' 
      AND constraint_name LIKE '%profile_id%'
    ) THEN
      ALTER TABLE time_entries 
      ADD CONSTRAINT time_entries_profile_id_fkey 
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'time_entries' 
        AND constraint_name LIKE '%site_id%'
      ) THEN
        ALTER TABLE time_entries 
        ADD CONSTRAINT time_entries_site_id_fkey 
        FOREIGN KEY (site_id) REFERENCES sites(id);
      END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scheduled_shifts') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'time_entries' 
        AND constraint_name LIKE '%scheduled_shift_id%'
      ) THEN
        ALTER TABLE time_entries 
        ADD CONSTRAINT fk_time_entries_scheduled_shift 
        FOREIGN KEY (scheduled_shift_id) REFERENCES scheduled_shifts(id);
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'time_entries' 
      AND constraint_name LIKE '%adjusted_by%'
    ) THEN
      ALTER TABLE time_entries 
      ADD CONSTRAINT time_entries_adjusted_by_fkey 
      FOREIGN KEY (adjusted_by) REFERENCES profiles(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'time_entries' 
      AND constraint_name LIKE '%approved_by%'
    ) THEN
      ALTER TABLE time_entries 
      ADD CONSTRAINT time_entries_approved_by_fkey 
      FOREIGN KEY (approved_by) REFERENCES profiles(id);
    END IF;

    CREATE INDEX IF NOT EXISTS idx_time_entries_company ON time_entries(company_id);
    CREATE INDEX IF NOT EXISTS idx_time_entries_profile ON time_entries(profile_id);
    CREATE INDEX IF NOT EXISTS idx_time_entries_date ON time_entries(clock_in);
    CREATE INDEX IF NOT EXISTS idx_time_entries_active ON time_entries(profile_id, status) WHERE status = 'active';
    CREATE INDEX IF NOT EXISTS idx_time_entries_approval ON time_entries(company_id, status) WHERE status = 'completed';
    CREATE INDEX IF NOT EXISTS idx_time_entries_site ON time_entries(site_id);

    -- Prevent duplicate active entries
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'time_entries' 
      AND indexname = 'idx_one_active_entry'
    ) THEN
      CREATE UNIQUE INDEX idx_one_active_entry 
      ON time_entries(profile_id)
      WHERE status = 'active';
    END IF;

    -- RLS
    ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "view_own_entries" ON time_entries;
    DROP POLICY IF EXISTS "managers_view_entries" ON time_entries;
    DROP POLICY IF EXISTS "employees_clock_in" ON time_entries;
    DROP POLICY IF EXISTS "employees_clock_out" ON time_entries;
    DROP POLICY IF EXISTS "managers_manage_entries" ON time_entries;

    -- Employees see their own entries
    CREATE POLICY "view_own_entries"
    ON time_entries FOR SELECT
    USING (
      profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

    -- Managers see all in company
    CREATE POLICY "managers_view_entries"
    ON time_entries FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role) IN ('admin', 'owner', 'manager')
      )
    );

    -- Employees can clock in (insert)
    CREATE POLICY "employees_clock_in"
    ON time_entries FOR INSERT
    WITH CHECK (
      profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

    -- Employees can clock out (update their active entry)
    CREATE POLICY "employees_clock_out"
    ON time_entries FOR UPDATE
    USING (
      profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
      AND status = 'active'
    );

    -- Managers can manage all entries
    CREATE POLICY "managers_manage_entries"
    ON time_entries FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role) IN ('admin', 'owner', 'manager')
      )
    );

    -- =====================================================
    -- CLOCK IN/OUT FUNCTIONS
    -- =====================================================

    -- Clock In
    CREATE OR REPLACE FUNCTION clock_in(
      p_profile_id UUID,
      p_site_id UUID DEFAULT NULL,
      p_location JSONB DEFAULT NULL,
      p_notes TEXT DEFAULT NULL
    )
    RETURNS UUID AS $function$
    DECLARE
      v_entry_id UUID;
      v_company_id UUID;
      v_scheduled_shift_id UUID;
      v_site_id UUID;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_entries')
         OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        RETURN NULL;
      END IF;

      -- Check not already clocked in
      IF EXISTS (SELECT 1 FROM time_entries WHERE profile_id = p_profile_id AND status = 'active') THEN
        RAISE EXCEPTION 'Already clocked in';
      END IF;
      
      SELECT company_id INTO v_company_id FROM profiles WHERE id = p_profile_id;
      
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found';
      END IF;
      
      -- Find matching scheduled shift (if table exists)
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scheduled_shifts') THEN
        SELECT id INTO v_scheduled_shift_id
        FROM scheduled_shifts
        WHERE profile_id = p_profile_id
          AND shift_date = CURRENT_DATE
          AND status IN ('scheduled', 'confirmed')
        ORDER BY start_time
        LIMIT 1;
      END IF;
      
      -- Get site_id
      IF p_site_id IS NOT NULL THEN
        v_site_id := p_site_id;
      ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'home_site') THEN
        SELECT home_site INTO v_site_id FROM profiles WHERE id = p_profile_id;
      ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'site_id') THEN
        SELECT site_id INTO v_site_id FROM profiles WHERE id = p_profile_id;
      END IF;
      
      INSERT INTO time_entries (
        company_id, profile_id, site_id, scheduled_shift_id,
        clock_in, clock_in_location, notes, status
      ) VALUES (
        v_company_id, p_profile_id, v_site_id,
        v_scheduled_shift_id,
        now(), p_location, p_notes, 'active'
      )
      RETURNING id INTO v_entry_id;
      
      RETURN v_entry_id;
    END;
    $function$ LANGUAGE plpgsql;

    -- Clock Out
    CREATE OR REPLACE FUNCTION clock_out(
      p_profile_id UUID,
      p_location JSONB DEFAULT NULL,
      p_notes TEXT DEFAULT NULL
    )
    RETURNS UUID AS $function$
    DECLARE
      v_entry_id UUID;
      v_clock_in TIMESTAMPTZ;
      v_gross_hours DECIMAL;
      v_net_hours DECIMAL;
      v_break_minutes INTEGER;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_entries') THEN
        RETURN NULL;
      END IF;

      -- Get active entry
      SELECT id, clock_in, total_break_minutes 
      INTO v_entry_id, v_clock_in, v_break_minutes
      FROM time_entries 
      WHERE profile_id = p_profile_id AND status = 'active';
      
      IF v_entry_id IS NULL THEN
        RAISE EXCEPTION 'Not clocked in';
      END IF;
      
      -- Calculate hours
      v_gross_hours := EXTRACT(EPOCH FROM (now() - v_clock_in)) / 3600;
      v_net_hours := v_gross_hours - (COALESCE(v_break_minutes, 0)::DECIMAL / 60);
      
      UPDATE time_entries SET
        clock_out = now(),
        clock_out_location = p_location,
        gross_hours = ROUND(v_gross_hours, 2),
        net_hours = ROUND(v_net_hours, 2),
        regular_hours = LEAST(ROUND(v_net_hours, 2), 8),
        overtime_hours = GREATEST(ROUND(v_net_hours, 2) - 8, 0),
        employee_notes = COALESCE(p_notes, employee_notes),
        status = 'completed',
        updated_at = now()
      WHERE id = v_entry_id;
      
      RETURN v_entry_id;
    END;
    $function$ LANGUAGE plpgsql;

    -- Start Break
    CREATE OR REPLACE FUNCTION start_break(p_profile_id UUID)
    RETURNS BOOLEAN AS $function$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_entries') THEN
        RETURN false;
      END IF;

      UPDATE time_entries SET
        break_start = now(),
        updated_at = now()
      WHERE profile_id = p_profile_id 
        AND status = 'active'
        AND break_start IS NULL;
      
      RETURN FOUND;
    END;
    $function$ LANGUAGE plpgsql;

    -- End Break
    CREATE OR REPLACE FUNCTION end_break(p_profile_id UUID)
    RETURNS BOOLEAN AS $function$
    DECLARE
      v_break_minutes INTEGER;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_entries') THEN
        RETURN false;
      END IF;

      UPDATE time_entries SET
        break_end = now(),
        total_break_minutes = total_break_minutes + 
          EXTRACT(EPOCH FROM (now() - break_start))::INTEGER / 60,
        break_start = NULL,
        break_end = NULL,
        updated_at = now()
      WHERE profile_id = p_profile_id 
        AND status = 'active'
        AND break_start IS NOT NULL;
      
      RETURN FOUND;
    END;
    $function$ LANGUAGE plpgsql;

    -- Get Current Status
    CREATE OR REPLACE FUNCTION get_clock_status(p_profile_id UUID)
    RETURNS TABLE (
      is_clocked_in BOOLEAN,
      is_on_break BOOLEAN,
      entry_id UUID,
      clock_in_time TIMESTAMPTZ,
      break_start_time TIMESTAMPTZ,
      elapsed_hours DECIMAL,
      break_minutes INTEGER
    ) AS $function$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_entries') THEN
        RETURN QUERY SELECT false, false, NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, 0::DECIMAL, 0;
        RETURN;
      END IF;

      RETURN QUERY
      SELECT 
        true,
        te.break_start IS NOT NULL,
        te.id,
        te.clock_in,
        te.break_start,
        ROUND(EXTRACT(EPOCH FROM (now() - te.clock_in)) / 3600, 2)::DECIMAL,
        te.total_break_minutes
      FROM time_entries te
      WHERE te.profile_id = p_profile_id AND te.status = 'active';
      
      IF NOT FOUND THEN
        RETURN QUERY SELECT false, false, NULL::UUID, NULL::TIMESTAMPTZ, NULL::TIMESTAMPTZ, 0::DECIMAL, 0;
      END IF;
    END;
    $function$ LANGUAGE plpgsql;

    RAISE NOTICE 'Created time_entries table with functions';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, profiles) do not exist yet - skipping time_entries table creation';
  END IF;
END $$;

