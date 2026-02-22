-- =====================================================
-- TIMESHEETS TABLE
-- Weekly/periodic summaries for approval
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    CREATE TABLE IF NOT EXISTS timesheets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      profile_id UUID NOT NULL,
      
      -- Period
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      
      -- Totals
      total_hours DECIMAL(6,2) DEFAULT 0,
      regular_hours DECIMAL(6,2) DEFAULT 0,
      overtime_hours DECIMAL(6,2) DEFAULT 0,
      break_hours DECIMAL(5,2) DEFAULT 0,
      
      -- Days worked
      days_worked INTEGER DEFAULT 0,
      
      -- Status
      status TEXT NOT NULL DEFAULT 'draft',
      -- Values: 'draft', 'submitted', 'approved', 'rejected', 'paid'
      
      -- Submission
      submitted_at TIMESTAMPTZ,
      submitted_by UUID,
      
      -- Approval
      approved_by UUID,
      approved_at TIMESTAMPTZ,
      rejection_reason TEXT,
      
      -- Notes
      employee_notes TEXT,
      manager_notes TEXT,
      
      -- Audit
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      
      UNIQUE(profile_id, period_start, period_end)
    );

    -- Add foreign key constraints
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'timesheets' 
      AND constraint_name LIKE '%company_id%'
    ) THEN
      ALTER TABLE timesheets 
      ADD CONSTRAINT timesheets_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'timesheets' 
      AND constraint_name LIKE '%profile_id%'
    ) THEN
      ALTER TABLE timesheets 
      ADD CONSTRAINT timesheets_profile_id_fkey 
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'timesheets' 
      AND constraint_name LIKE '%submitted_by%'
    ) THEN
      ALTER TABLE timesheets 
      ADD CONSTRAINT timesheets_submitted_by_fkey 
      FOREIGN KEY (submitted_by) REFERENCES profiles(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'timesheets' 
      AND constraint_name LIKE '%approved_by%'
    ) THEN
      ALTER TABLE timesheets 
      ADD CONSTRAINT timesheets_approved_by_fkey 
      FOREIGN KEY (approved_by) REFERENCES profiles(id);
    END IF;

    CREATE INDEX IF NOT EXISTS idx_timesheets_company ON timesheets(company_id);
    CREATE INDEX IF NOT EXISTS idx_timesheets_profile ON timesheets(profile_id);
    CREATE INDEX IF NOT EXISTS idx_timesheets_period ON timesheets(period_start, period_end);
    CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status);
    CREATE INDEX IF NOT EXISTS idx_timesheets_approval ON timesheets(company_id, status) WHERE status = 'submitted';

    -- RLS
    ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "view_own_timesheets" ON timesheets;
    DROP POLICY IF EXISTS "managers_view_timesheets" ON timesheets;
    DROP POLICY IF EXISTS "manage_own_timesheets" ON timesheets;
    DROP POLICY IF EXISTS "managers_manage_timesheets" ON timesheets;

    CREATE POLICY "view_own_timesheets"
    ON timesheets FOR SELECT
    USING (
      profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

    CREATE POLICY "managers_view_timesheets"
    ON timesheets FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role::text) IN ('admin', 'owner', 'manager')
      )
    );

    CREATE POLICY "manage_own_timesheets"
    ON timesheets FOR ALL
    USING (
      profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

    CREATE POLICY "managers_manage_timesheets"
    ON timesheets FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role::text) IN ('admin', 'owner', 'manager')
      )
    );

    -- =====================================================
    -- GENERATE TIMESHEET
    -- =====================================================

    CREATE OR REPLACE FUNCTION generate_timesheet(
      p_profile_id UUID,
      p_period_start DATE,
      p_period_end DATE
    )
    RETURNS UUID AS $function$
    DECLARE
      v_timesheet_id UUID;
      v_company_id UUID;
      v_totals RECORD;
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'timesheets')
         OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        RETURN NULL;
      END IF;

      SELECT company_id INTO v_company_id FROM profiles WHERE id = p_profile_id;
      
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile not found';
      END IF;
      
      -- Calculate totals from time entries (if table exists)
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_entries') THEN
        SELECT 
          COALESCE(SUM(net_hours), 0) as total,
          COALESCE(SUM(regular_hours), 0) as regular,
          COALESCE(SUM(overtime_hours), 0) as overtime,
          COALESCE(SUM(total_break_minutes), 0) / 60.0 as breaks,
          COUNT(DISTINCT DATE(clock_in)) as days
        INTO v_totals
        FROM time_entries
        WHERE profile_id = p_profile_id
          AND DATE(clock_in) >= p_period_start
          AND DATE(clock_in) <= p_period_end
          AND status IN ('completed', 'approved');
      ELSE
        v_totals := ROW(0, 0, 0, 0, 0)::RECORD;
      END IF;
      
      -- Upsert timesheet
      INSERT INTO timesheets (
        company_id, profile_id, period_start, period_end,
        total_hours, regular_hours, overtime_hours, break_hours, days_worked
      ) VALUES (
        v_company_id, p_profile_id, p_period_start, p_period_end,
        v_totals.total, v_totals.regular, v_totals.overtime, v_totals.breaks, v_totals.days
      )
      ON CONFLICT (profile_id, period_start, period_end) DO UPDATE SET
        total_hours = EXCLUDED.total_hours,
        regular_hours = EXCLUDED.regular_hours,
        overtime_hours = EXCLUDED.overtime_hours,
        break_hours = EXCLUDED.break_hours,
        days_worked = EXCLUDED.days_worked,
        updated_at = now()
      RETURNING id INTO v_timesheet_id;
      
      RETURN v_timesheet_id;
    END;
    $function$ LANGUAGE plpgsql;

    -- =====================================================
    -- APPROVE TIMESHEET
    -- =====================================================

    CREATE OR REPLACE FUNCTION approve_timesheet(
      p_timesheet_id UUID,
      p_approver_id UUID,
      p_notes TEXT DEFAULT NULL
    )
    RETURNS BOOLEAN AS $function$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'timesheets') THEN
        RETURN false;
      END IF;

      UPDATE timesheets SET
        status = 'approved',
        approved_by = p_approver_id,
        approved_at = now(),
        manager_notes = p_notes,
        updated_at = now()
      WHERE id = p_timesheet_id AND status = 'submitted';
      
      -- Also approve all related time entries (if table exists)
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'time_entries') THEN
        UPDATE time_entries SET
          status = 'approved',
          approved_by = p_approver_id,
          approved_at = now()
        WHERE profile_id = (SELECT profile_id FROM timesheets WHERE id = p_timesheet_id)
          AND DATE(clock_in) >= (SELECT period_start FROM timesheets WHERE id = p_timesheet_id)
          AND DATE(clock_in) <= (SELECT period_end FROM timesheets WHERE id = p_timesheet_id)
          AND status = 'completed';
      END IF;
      
      RETURN FOUND;
    END;
    $function$ LANGUAGE plpgsql;

    RAISE NOTICE 'Created timesheets table with functions';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, profiles) do not exist yet - skipping timesheets table creation';
  END IF;
END $$;

