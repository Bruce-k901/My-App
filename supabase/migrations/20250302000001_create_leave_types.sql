-- =====================================================
-- LEAVE TYPES TABLE
-- Configurable leave categories per company
-- =====================================================
-- Note: This migration will be skipped if companies table doesn't exist yet

DO $$
DECLARE
  company_record RECORD;
BEGIN
  -- Only proceed if companies table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN

    CREATE TABLE IF NOT EXISTS leave_types (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      
      -- Basic info
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      description TEXT,
      
      -- Behavior settings
      is_paid BOOLEAN DEFAULT true,
      requires_approval BOOLEAN DEFAULT true,
      deducts_from_allowance BOOLEAN DEFAULT true,
      allow_half_days BOOLEAN DEFAULT true,
      allow_negative_balance BOOLEAN DEFAULT false,
      
      -- Notice requirements
      min_notice_days INTEGER DEFAULT 0,
      max_consecutive_days INTEGER,
      
      -- Accrual settings
      is_accrual_based BOOLEAN DEFAULT false,
      accrual_rate DECIMAL(5,3),
      
      -- Carry over rules
      allow_carry_over BOOLEAN DEFAULT true,
      max_carry_over_days DECIMAL(5,2),
      carry_over_expiry_months INTEGER,
      
      -- Display
      color TEXT DEFAULT '#6366f1',
      icon TEXT DEFAULT 'calendar',
      sort_order INTEGER DEFAULT 0,
      
      -- Status
      is_active BOOLEAN DEFAULT true,
      is_default BOOLEAN DEFAULT false,
      
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      
      UNIQUE(company_id, code)
    );

    -- Add foreign key constraint
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'leave_types' 
      AND constraint_name LIKE '%company_id%'
    ) THEN
      ALTER TABLE leave_types 
      ADD CONSTRAINT leave_types_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_leave_types_company ON leave_types(company_id);
    CREATE INDEX IF NOT EXISTS idx_leave_types_active ON leave_types(company_id, is_active) WHERE is_active = true;

    -- RLS
    ALTER TABLE leave_types ENABLE ROW LEVEL SECURITY;

    -- Only create policies if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
      DROP POLICY IF EXISTS "view_company_leave_types" ON leave_types;
      DROP POLICY IF EXISTS "manage_leave_types" ON leave_types;

      CREATE POLICY "view_company_leave_types"
      ON leave_types FOR SELECT
      USING (
        company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid())
      );

      CREATE POLICY "manage_leave_types"
      ON leave_types FOR ALL
      USING (
        company_id IN (
          SELECT company_id FROM profiles 
          WHERE auth_user_id = auth.uid() 
          AND LOWER(app_role) IN ('admin', 'owner')
        )
      );
    END IF;

    -- =====================================================
    -- SEED DEFAULT LEAVE TYPES FUNCTION
    -- =====================================================

    CREATE OR REPLACE FUNCTION seed_default_leave_types(p_company_id UUID)
    RETURNS void AS $function$
    BEGIN
      -- Only proceed if leave_types table exists
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leave_types') THEN
        -- Annual Leave
        INSERT INTO leave_types (company_id, name, code, description, is_paid, requires_approval, deducts_from_allowance, color, icon, sort_order, is_default)
        VALUES (p_company_id, 'Annual Leave', 'AL', 'Paid holiday from your annual allowance', true, true, true, '#10b981', 'palm-tree', 1, true)
        ON CONFLICT (company_id, code) DO NOTHING;
        
        -- Sick Leave
        INSERT INTO leave_types (company_id, name, code, description, is_paid, requires_approval, deducts_from_allowance, min_notice_days, color, icon, sort_order, is_default)
        VALUES (p_company_id, 'Sick Leave', 'SICK', 'Time off due to illness', true, false, false, 0, '#ef4444', 'thermometer', 2, true)
        ON CONFLICT (company_id, code) DO NOTHING;
        
        -- TOIL
        INSERT INTO leave_types (company_id, name, code, description, is_paid, requires_approval, deducts_from_allowance, is_accrual_based, color, icon, sort_order, is_default)
        VALUES (p_company_id, 'TOIL', 'TOIL', 'Time off in lieu of overtime worked', true, true, false, true, '#8b5cf6', 'clock', 3, true)
        ON CONFLICT (company_id, code) DO NOTHING;
        
        -- Unpaid Leave
        INSERT INTO leave_types (company_id, name, code, description, is_paid, requires_approval, deducts_from_allowance, min_notice_days, color, icon, sort_order, is_default)
        VALUES (p_company_id, 'Unpaid Leave', 'UNPAID', 'Unpaid time off', false, true, false, 7, '#6b7280', 'calendar-off', 4, true)
        ON CONFLICT (company_id, code) DO NOTHING;
        
        -- Compassionate Leave
        INSERT INTO leave_types (company_id, name, code, description, is_paid, requires_approval, deducts_from_allowance, min_notice_days, max_consecutive_days, color, icon, sort_order, is_default)
        VALUES (p_company_id, 'Compassionate Leave', 'COMP', 'Time off for bereavement or family emergency', true, true, false, 0, 5, '#f59e0b', 'heart', 5, true)
        ON CONFLICT (company_id, code) DO NOTHING;
        
        -- Maternity Leave
        INSERT INTO leave_types (company_id, name, code, description, is_paid, requires_approval, deducts_from_allowance, min_notice_days, color, icon, sort_order, is_default)
        VALUES (p_company_id, 'Maternity Leave', 'MAT', 'Statutory maternity leave', true, true, false, 105, '#ec4899', 'baby', 6, true)
        ON CONFLICT (company_id, code) DO NOTHING;
        
        -- Paternity Leave
        INSERT INTO leave_types (company_id, name, code, description, is_paid, requires_approval, deducts_from_allowance, min_notice_days, max_consecutive_days, color, icon, sort_order, is_default)
        VALUES (p_company_id, 'Paternity Leave', 'PAT', 'Statutory paternity leave', true, true, false, 105, 14, '#3b82f6', 'baby', 7, true)
        ON CONFLICT (company_id, code) DO NOTHING;
      END IF;
    END;
    $function$ LANGUAGE plpgsql;

    -- Trigger for new companies
    CREATE OR REPLACE FUNCTION trigger_seed_leave_types()
    RETURNS TRIGGER AS $function$
    BEGIN
      PERFORM seed_default_leave_types(NEW.id);
      RETURN NEW;
    END;
    $function$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trigger_new_company_leave_types ON companies;
    CREATE TRIGGER trigger_new_company_leave_types
      AFTER INSERT ON companies
      FOR EACH ROW
      EXECUTE FUNCTION trigger_seed_leave_types();

    -- Seed for existing companies
    FOR company_record IN SELECT id FROM companies LOOP
      PERFORM seed_default_leave_types(company_record.id);
    END LOOP;

    RAISE NOTICE 'Created leave_types table and seeded default leave types';

  ELSE
    RAISE NOTICE '⚠️ companies table does not exist yet - skipping leave_types table creation';
  END IF;
END $$;

