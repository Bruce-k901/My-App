-- =====================================================
-- PAY PERIODS TABLE
-- Company pay cycle configuration
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    CREATE TABLE IF NOT EXISTS pay_periods (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      
      -- Period type
      period_type TEXT NOT NULL DEFAULT 'monthly',
      -- Values: 'weekly', 'biweekly', 'monthly'
      
      -- Period dates
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      pay_date DATE NOT NULL,
      
      -- Status
      status TEXT NOT NULL DEFAULT 'open',
      -- Values: 'open', 'processing', 'approved', 'paid', 'closed'
      
      -- Totals (calculated)
      total_gross INTEGER DEFAULT 0,
      total_deductions INTEGER DEFAULT 0,
      total_net INTEGER DEFAULT 0,
      employee_count INTEGER DEFAULT 0,
      
      -- Approval
      approved_by UUID,
      approved_at TIMESTAMPTZ,
      
      -- Notes
      notes TEXT,
      
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      
      UNIQUE(company_id, period_start, period_end)
    );

    -- Add foreign key constraints
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'pay_periods' 
      AND constraint_name LIKE '%company_id%'
    ) THEN
      ALTER TABLE pay_periods 
      ADD CONSTRAINT pay_periods_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'pay_periods' 
      AND constraint_name LIKE '%approved_by%'
    ) THEN
      ALTER TABLE pay_periods 
      ADD CONSTRAINT pay_periods_approved_by_fkey 
      FOREIGN KEY (approved_by) REFERENCES profiles(id);
    END IF;

    CREATE INDEX IF NOT EXISTS idx_pay_periods_company ON pay_periods(company_id);
    CREATE INDEX IF NOT EXISTS idx_pay_periods_dates ON pay_periods(period_start, period_end);
    CREATE INDEX IF NOT EXISTS idx_pay_periods_status ON pay_periods(status);

    -- RLS
    ALTER TABLE pay_periods ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "admin_manage_pay_periods" ON pay_periods;

    CREATE POLICY "admin_manage_pay_periods"
    ON pay_periods FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role) IN ('admin', 'owner')
      )
    );

    -- =====================================================
    -- PAYSLIPS TABLE
    -- Individual employee pay records
    -- =====================================================

    CREATE TABLE IF NOT EXISTS payslips (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      profile_id UUID NOT NULL,
      pay_period_id UUID NOT NULL,
      
      -- Pay rate used
      pay_rate_id UUID,
      
      -- Hours breakdown
      regular_hours DECIMAL(6,2) DEFAULT 0,
      overtime_hours DECIMAL(6,2) DEFAULT 0,
      weekend_hours DECIMAL(6,2) DEFAULT 0,
      holiday_hours DECIMAL(6,2) DEFAULT 0,
      
      -- Earnings (in pence)
      regular_pay INTEGER DEFAULT 0,
      overtime_pay INTEGER DEFAULT 0,
      weekend_pay INTEGER DEFAULT 0,
      holiday_pay INTEGER DEFAULT 0,
      bonus INTEGER DEFAULT 0,
      commission INTEGER DEFAULT 0,
      tips INTEGER DEFAULT 0,
      other_earnings INTEGER DEFAULT 0,
      
      gross_pay INTEGER DEFAULT 0,
      
      -- Deductions (in pence)
      tax_paye INTEGER DEFAULT 0,
      national_insurance INTEGER DEFAULT 0,
      pension INTEGER DEFAULT 0,
      student_loan INTEGER DEFAULT 0,
      other_deductions INTEGER DEFAULT 0,
      
      total_deductions INTEGER DEFAULT 0,
      
      net_pay INTEGER DEFAULT 0,
      
      -- Tax details
      tax_code TEXT,
      ni_category TEXT DEFAULT 'A',
      
      -- YTD totals
      ytd_gross INTEGER DEFAULT 0,
      ytd_tax INTEGER DEFAULT 0,
      ytd_ni INTEGER DEFAULT 0,
      
      -- Status
      status TEXT NOT NULL DEFAULT 'draft',
      -- Values: 'draft', 'calculated', 'approved', 'paid'
      
      -- Notes
      notes TEXT,
      employee_notes TEXT,
      
      -- Audit
      calculated_at TIMESTAMPTZ,
      approved_by UUID,
      approved_at TIMESTAMPTZ,
      paid_at TIMESTAMPTZ,
      
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      
      UNIQUE(profile_id, pay_period_id)
    );

    -- Add foreign key constraints
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'payslips' 
      AND constraint_name LIKE '%company_id%'
    ) THEN
      ALTER TABLE payslips 
      ADD CONSTRAINT payslips_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'payslips' 
      AND constraint_name LIKE '%profile_id%'
    ) THEN
      ALTER TABLE payslips 
      ADD CONSTRAINT payslips_profile_id_fkey 
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pay_periods') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'payslips' 
        AND constraint_name LIKE '%pay_period_id%'
      ) THEN
        ALTER TABLE payslips 
        ADD CONSTRAINT payslips_pay_period_id_fkey 
        FOREIGN KEY (pay_period_id) REFERENCES pay_periods(id) ON DELETE CASCADE;
      END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pay_rates') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'payslips' 
        AND constraint_name LIKE '%pay_rate_id%'
      ) THEN
        ALTER TABLE payslips 
        ADD CONSTRAINT payslips_pay_rate_id_fkey 
        FOREIGN KEY (pay_rate_id) REFERENCES pay_rates(id);
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'payslips' 
      AND constraint_name LIKE '%approved_by%'
    ) THEN
      ALTER TABLE payslips 
      ADD CONSTRAINT payslips_approved_by_fkey 
      FOREIGN KEY (approved_by) REFERENCES profiles(id);
    END IF;

    CREATE INDEX IF NOT EXISTS idx_payslips_company ON payslips(company_id);
    CREATE INDEX IF NOT EXISTS idx_payslips_profile ON payslips(profile_id);
    CREATE INDEX IF NOT EXISTS idx_payslips_period ON payslips(pay_period_id);
    CREATE INDEX IF NOT EXISTS idx_payslips_status ON payslips(status);

    -- RLS
    ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "view_own_payslips" ON payslips;
    DROP POLICY IF EXISTS "admin_manage_payslips" ON payslips;

    -- Employees can view their own payslips
    CREATE POLICY "view_own_payslips"
    ON payslips FOR SELECT
    USING (
      profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

    CREATE POLICY "admin_manage_payslips"
    ON payslips FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role) IN ('admin', 'owner')
      )
    );

    -- =====================================================
    -- DEDUCTIONS/ADDITIONS TABLE
    -- Recurring or one-time adjustments
    -- =====================================================

    CREATE TABLE IF NOT EXISTS payroll_adjustments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      profile_id UUID NOT NULL,
      
      -- Type
      adjustment_type TEXT NOT NULL,
      -- Values: 'deduction', 'addition'
      
      -- Category
      category TEXT NOT NULL,
      -- Deductions: 'pension', 'student_loan', 'attachment', 'advance', 'other'
      -- Additions: 'bonus', 'commission', 'expense', 'allowance', 'other'
      
      name TEXT NOT NULL,
      description TEXT,
      
      -- Amount
      amount INTEGER NOT NULL,
      -- In pence, positive number
      
      -- Or percentage
      is_percentage BOOLEAN DEFAULT false,
      percentage DECIMAL(5,2),
      
      -- Recurrence
      is_recurring BOOLEAN DEFAULT false,
      recurrence TEXT,
      -- Values: 'every_pay', 'monthly', 'annual'
      
      -- Validity
      effective_from DATE DEFAULT CURRENT_DATE,
      effective_to DATE,
      
      -- For one-time: link to specific pay period
      pay_period_id UUID,
      
      -- Status
      is_active BOOLEAN DEFAULT true,
      
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT now()
    );

    -- Add foreign key constraints
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'payroll_adjustments' 
      AND constraint_name LIKE '%company_id%'
    ) THEN
      ALTER TABLE payroll_adjustments 
      ADD CONSTRAINT payroll_adjustments_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'payroll_adjustments' 
      AND constraint_name LIKE '%profile_id%'
    ) THEN
      ALTER TABLE payroll_adjustments 
      ADD CONSTRAINT payroll_adjustments_profile_id_fkey 
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pay_periods') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'payroll_adjustments' 
        AND constraint_name LIKE '%pay_period_id%'
      ) THEN
        ALTER TABLE payroll_adjustments 
        ADD CONSTRAINT payroll_adjustments_pay_period_id_fkey 
        FOREIGN KEY (pay_period_id) REFERENCES pay_periods(id);
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'payroll_adjustments' 
      AND constraint_name LIKE '%created_by%'
    ) THEN
      ALTER TABLE payroll_adjustments 
      ADD CONSTRAINT payroll_adjustments_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES profiles(id);
    END IF;

    CREATE INDEX IF NOT EXISTS idx_adjustments_profile ON payroll_adjustments(profile_id);
    CREATE INDEX IF NOT EXISTS idx_adjustments_active ON payroll_adjustments(profile_id, is_active) WHERE is_active = true;

    -- RLS
    ALTER TABLE payroll_adjustments ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "view_own_adjustments" ON payroll_adjustments;
    DROP POLICY IF EXISTS "admin_manage_adjustments" ON payroll_adjustments;

    CREATE POLICY "view_own_adjustments"
    ON payroll_adjustments FOR SELECT
    USING (
      profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    );

    CREATE POLICY "admin_manage_adjustments"
    ON payroll_adjustments FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role) IN ('admin', 'owner')
      )
    );

    RAISE NOTICE 'Created payroll tables (pay_periods, payslips, payroll_adjustments) with RLS policies';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, profiles) do not exist yet - skipping payroll tables creation';
  END IF;
END $$;

