-- =====================================================
-- LEAVE BALANCES TABLE
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_types') THEN

    CREATE TABLE IF NOT EXISTS leave_balances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      profile_id UUID NOT NULL,
      leave_type_id UUID NOT NULL,
      
      -- Year tracking
      year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
      
      -- Allowances
      entitled_days DECIMAL(5,2) NOT NULL DEFAULT 0,
      carried_over DECIMAL(5,2) NOT NULL DEFAULT 0,
      adjustments DECIMAL(5,2) NOT NULL DEFAULT 0,
      
      -- Usage tracking
      taken_days DECIMAL(5,2) NOT NULL DEFAULT 0,
      pending_days DECIMAL(5,2) NOT NULL DEFAULT 0,
      
      -- Metadata
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      
      UNIQUE(profile_id, leave_type_id, year)
    );

    -- Add foreign key constraints
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'leave_balances' 
      AND constraint_name LIKE '%company_id%'
    ) THEN
      ALTER TABLE leave_balances 
      ADD CONSTRAINT leave_balances_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'leave_balances' 
      AND constraint_name LIKE '%profile_id%'
    ) THEN
      ALTER TABLE leave_balances 
      ADD CONSTRAINT leave_balances_profile_id_fkey 
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'leave_balances' 
      AND constraint_name LIKE '%leave_type_id%'
    ) THEN
      ALTER TABLE leave_balances 
      ADD CONSTRAINT leave_balances_leave_type_id_fkey 
      FOREIGN KEY (leave_type_id) REFERENCES leave_types(id);
    END IF;

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_leave_balances_profile ON leave_balances(profile_id);
    CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON leave_balances(profile_id, year);

    -- RLS
    ALTER TABLE leave_balances ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "view_own_balances" ON leave_balances;
    DROP POLICY IF EXISTS "managers_view_balances" ON leave_balances;
    DROP POLICY IF EXISTS "admins_manage_balances" ON leave_balances;

    CREATE POLICY "view_own_balances"
    ON leave_balances FOR SELECT
    USING (
      profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

    CREATE POLICY "managers_view_balances"
    ON leave_balances FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
      )
    );

    CREATE POLICY "admins_manage_balances"
    ON leave_balances FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner')
      )
    )
    WITH CHECK (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE id = auth.uid() 
        AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner')
      )
    );

    -- =====================================================
    -- HELPER FUNCTIONS
    -- =====================================================

    -- Get remaining balance
    CREATE OR REPLACE FUNCTION get_leave_balance(
      p_profile_id UUID, 
      p_leave_type_id UUID, 
      p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
    )
    RETURNS DECIMAL AS $function$
    DECLARE
      v_balance DECIMAL;
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_balances') THEN
        SELECT 
          entitled_days + carried_over + adjustments - taken_days - pending_days
        INTO v_balance
        FROM leave_balances
        WHERE profile_id = p_profile_id 
          AND leave_type_id = p_leave_type_id 
          AND year = p_year;
      ELSE
        v_balance := 0;
      END IF;
      
      RETURN COALESCE(v_balance, 0);
    END;
    $function$ LANGUAGE plpgsql;

    -- Initialize balance for an employee
    CREATE OR REPLACE FUNCTION initialize_leave_balance(
      p_profile_id UUID,
      p_leave_type_id UUID,
      p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
    )
    RETURNS UUID AS $function$
    DECLARE
      v_balance_id UUID;
      v_company_id UUID;
      v_entitlement DECIMAL;
      v_deducts BOOLEAN;
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
         AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_types')
         AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_balances') THEN
        SELECT p.company_id, lt.deducts_from_allowance
        INTO v_company_id, v_deducts
        FROM profiles p
        JOIN leave_types lt ON lt.id = p_leave_type_id
        WHERE p.id = p_profile_id;
        
        IF v_deducts THEN
          SELECT COALESCE(annual_leave_allowance, 28)
          INTO v_entitlement
          FROM profiles WHERE id = p_profile_id;
        ELSE
          v_entitlement := 0;
        END IF;
        
        INSERT INTO leave_balances (company_id, profile_id, leave_type_id, year, entitled_days)
        VALUES (v_company_id, p_profile_id, p_leave_type_id, p_year, v_entitlement)
        ON CONFLICT (profile_id, leave_type_id, year) 
        DO UPDATE SET updated_at = now()
        RETURNING id INTO v_balance_id;
      END IF;
      
      RETURN v_balance_id;
    END;
    $function$ LANGUAGE plpgsql;

    -- =====================================================
    -- TRIGGERS FOR BALANCE UPDATES
    -- =====================================================

    -- When a leave request is created
    CREATE OR REPLACE FUNCTION on_leave_request_created()
    RETURNS TRIGGER AS $function$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_balances') THEN
        -- Initialize balance if needed
        PERFORM initialize_leave_balance(
          NEW.profile_id, 
          NEW.leave_type_id, 
          EXTRACT(YEAR FROM NEW.start_date)::INTEGER
        );
        
        -- Add to pending days
        UPDATE leave_balances
        SET pending_days = pending_days + NEW.total_days,
            updated_at = now()
        WHERE profile_id = NEW.profile_id 
          AND leave_type_id = NEW.leave_type_id
          AND year = EXTRACT(YEAR FROM NEW.start_date);
      END IF;
      
      RETURN NEW;
    END;
    $function$ LANGUAGE plpgsql;

    -- Only create trigger if leave_requests table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_requests') THEN
      DROP TRIGGER IF EXISTS trigger_leave_request_created ON leave_requests;
      CREATE TRIGGER trigger_leave_request_created
        AFTER INSERT ON leave_requests
        FOR EACH ROW
        WHEN (NEW.status = 'pending')
        EXECUTE FUNCTION on_leave_request_created();
    END IF;

    -- When a leave request status changes
    CREATE OR REPLACE FUNCTION on_leave_request_status_change()
    RETURNS TRIGGER AS $function$
    BEGIN
      IF OLD.status = NEW.status THEN
        RETURN NEW;
      END IF;
      
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_balances') THEN
        -- Pending -> Approved
        IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
          UPDATE leave_balances
          SET 
            pending_days = pending_days - NEW.total_days,
            taken_days = taken_days + NEW.total_days,
            updated_at = now()
          WHERE profile_id = NEW.profile_id 
            AND leave_type_id = NEW.leave_type_id
            AND year = EXTRACT(YEAR FROM NEW.start_date);
        
        -- Pending -> Declined or Cancelled
        ELSIF OLD.status = 'pending' AND NEW.status IN ('declined', 'cancelled') THEN
          UPDATE leave_balances
          SET 
            pending_days = pending_days - NEW.total_days,
            updated_at = now()
          WHERE profile_id = NEW.profile_id 
            AND leave_type_id = NEW.leave_type_id
            AND year = EXTRACT(YEAR FROM NEW.start_date);
        
        -- Approved -> Cancelled
        ELSIF OLD.status = 'approved' AND NEW.status = 'cancelled' THEN
          UPDATE leave_balances
          SET 
            taken_days = taken_days - NEW.total_days,
            updated_at = now()
          WHERE profile_id = NEW.profile_id 
            AND leave_type_id = NEW.leave_type_id
            AND year = EXTRACT(YEAR FROM NEW.start_date);
        END IF;
      END IF;
      
      RETURN NEW;
    END;
    $function$ LANGUAGE plpgsql;

    -- Only create trigger if leave_requests table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_requests') THEN
      DROP TRIGGER IF EXISTS trigger_leave_request_status_change ON leave_requests;
      CREATE TRIGGER trigger_leave_request_status_change
        AFTER UPDATE ON leave_requests
        FOR EACH ROW
        EXECUTE FUNCTION on_leave_request_status_change();
    END IF;

    RAISE NOTICE 'Created leave_balances table with functions and triggers';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, profiles, leave_types) do not exist yet - skipping leave_balances table creation';
  END IF;
END $$;

