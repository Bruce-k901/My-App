-- =====================================================
-- LEAVE REQUESTS TABLE
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_types') THEN

    CREATE TABLE IF NOT EXISTS leave_requests (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      profile_id UUID NOT NULL,
      leave_type_id UUID NOT NULL,
      
      -- Request dates
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      
      -- Half day options
      start_half_day BOOLEAN DEFAULT false,
      end_half_day BOOLEAN DEFAULT false,
      
      -- Calculated total
      total_days DECIMAL(5,2) NOT NULL,
      
      -- Status workflow
      status TEXT NOT NULL DEFAULT 'pending',
      -- Values: 'pending', 'approved', 'declined', 'cancelled', 'taken'
      
      -- Request details
      reason TEXT,
      
      -- Approval tracking
      requested_at TIMESTAMPTZ DEFAULT now(),
      reviewed_by UUID,
      reviewed_at TIMESTAMPTZ,
      decline_reason TEXT,
      
      -- Notes
      employee_notes TEXT,
      manager_notes TEXT,
      
      -- Audit
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      
      CONSTRAINT valid_date_range CHECK (end_date >= start_date),
      CONSTRAINT valid_total_days CHECK (total_days > 0),
      CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'declined', 'cancelled', 'taken'))
    );

    -- Add foreign key constraints
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'leave_requests' 
      AND constraint_name LIKE '%company_id%'
    ) THEN
      ALTER TABLE leave_requests 
      ADD CONSTRAINT leave_requests_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'leave_requests' 
      AND constraint_name LIKE '%profile_id%'
    ) THEN
      ALTER TABLE leave_requests 
      ADD CONSTRAINT leave_requests_profile_id_fkey 
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'leave_requests' 
      AND constraint_name LIKE '%leave_type_id%'
    ) THEN
      ALTER TABLE leave_requests 
      ADD CONSTRAINT leave_requests_leave_type_id_fkey 
      FOREIGN KEY (leave_type_id) REFERENCES leave_types(id);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'leave_requests' 
      AND constraint_name LIKE '%reviewed_by%'
    ) THEN
      ALTER TABLE leave_requests 
      ADD CONSTRAINT leave_requests_reviewed_by_fkey 
      FOREIGN KEY (reviewed_by) REFERENCES profiles(id);
    END IF;

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_leave_requests_profile ON leave_requests(profile_id);
    CREATE INDEX IF NOT EXISTS idx_leave_requests_company ON leave_requests(company_id);
    CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
    CREATE INDEX IF NOT EXISTS idx_leave_requests_pending ON leave_requests(company_id, status) WHERE status = 'pending';

    -- RLS
    ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "view_own_leave_requests" ON leave_requests;
    DROP POLICY IF EXISTS "managers_view_leave_requests" ON leave_requests;
    DROP POLICY IF EXISTS "create_own_leave_requests" ON leave_requests;
    DROP POLICY IF EXISTS "update_own_pending_requests" ON leave_requests;
    DROP POLICY IF EXISTS "managers_update_requests" ON leave_requests;

    -- Employees can view their own requests
    CREATE POLICY "view_own_leave_requests"
    ON leave_requests FOR SELECT
    USING (
      profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

    -- Managers can view all requests in their company
    CREATE POLICY "managers_view_leave_requests"
    ON leave_requests FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role) IN ('admin', 'owner', 'manager')
      )
    );

    -- Employees can create their own requests
    CREATE POLICY "create_own_leave_requests"
    ON leave_requests FOR INSERT
    WITH CHECK (
      profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

    -- Employees can update their own pending requests
    CREATE POLICY "update_own_pending_requests"
    ON leave_requests FOR UPDATE
    USING (
      profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
      AND status = 'pending'
    );

    -- Managers can update any request in their company
    CREATE POLICY "managers_update_requests"
    ON leave_requests FOR UPDATE
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role) IN ('admin', 'owner', 'manager')
      )
    );

    -- Update timestamp trigger function (create if it doesn't exist)
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $function$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $function$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_leave_requests_updated ON leave_requests;
    CREATE TRIGGER trigger_leave_requests_updated
      BEFORE UPDATE ON leave_requests
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    RAISE NOTICE 'Created leave_requests table with RLS policies';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, profiles, leave_types) do not exist yet - skipping leave_requests table creation';
  END IF;
END $$;

