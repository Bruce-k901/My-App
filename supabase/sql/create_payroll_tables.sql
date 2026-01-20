-- =====================================================
-- PAYROLL SYSTEM - COMPLETE SCHEMA
-- Run this in Supabase Dashboard → SQL Editor
-- =====================================================

-- 1. EXTEND PROFILES TABLE FOR PAY INFORMATION
-- =====================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS pay_type TEXT DEFAULT 'hourly' 
  CHECK (pay_type IN ('hourly', 'salaried', 'zero_hours')),
ADD COLUMN IF NOT EXISTS annual_salary DECIMAL(10,2),           -- For salaried staff
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(6,2),              -- For hourly/zero hours
ADD COLUMN IF NOT EXISTS tax_code TEXT DEFAULT '1257L',         -- UK tax code
ADD COLUMN IF NOT EXISTS ni_category TEXT DEFAULT 'A',          -- NI category (A, B, C, etc.)
ADD COLUMN IF NOT EXISTS pension_enrolled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pension_employee_pct DECIMAL(4,2) DEFAULT 5.00,  -- Employee contribution %
ADD COLUMN IF NOT EXISTS pension_employer_pct DECIMAL(4,2) DEFAULT 3.00,  -- Employer contribution %
ADD COLUMN IF NOT EXISTS student_loan_plan TEXT,                -- Plan 1, 2, 4, 5, PG
ADD COLUMN IF NOT EXISTS payroll_id TEXT,                       -- External payroll system ID
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'bacs' 
  CHECK (payment_method IN ('bacs', 'cheque', 'cash')),
ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
ADD COLUMN IF NOT EXISTS bank_sort_code TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS onboarding_status TEXT 
  CHECK (onboarding_status IN ('pending', 'in_progress', 'hired', 'not_hired'));

-- Index for payroll queries
CREATE INDEX IF NOT EXISTS idx_profiles_pay_type ON profiles(company_id, pay_type);

-- 2. EXTEND STAFF_ATTENDANCE FOR TRIAL SHIFTS
-- =====================================================

ALTER TABLE staff_attendance
ADD COLUMN IF NOT EXISTS is_trial_shift BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_attendance_trial_shift 
ON staff_attendance(company_id, is_trial_shift) 
WHERE is_trial_shift = true;

-- 3. CREATE PAYROLL_RUNS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Period info
  pay_period_type TEXT NOT NULL CHECK (pay_period_type IN ('weekly', 'fortnightly', 'monthly')),
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  pay_date DATE NOT NULL,                    -- When staff get paid
  
  -- Scope (can be all sites or specific)
  site_ids UUID[] DEFAULT NULL,              -- NULL = all sites
  
  -- Totals (snapshot at creation)
  total_employees INTEGER NOT NULL,
  total_hours DECIMAL(10,2),
  total_gross_pay DECIMAL(12,2),
  total_employer_ni DECIMAL(10,2),
  total_employer_pension DECIMAL(10,2),
  total_holiday_accrual DECIMAL(10,2),
  total_employer_cost DECIMAL(12,2),         -- Gross + NI + Pension
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft',           -- Being prepared
    'pending_review',  -- Needs approval
    'approved',        -- Ready to export
    'exported',        -- Sent to accounting package
    'paid'             -- Confirmed paid
  )),
  
  -- Workflow
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  exported_at TIMESTAMPTZ,
  export_format TEXT,                        -- 'xero', 'sage', 'quickbooks', 'csv'
  export_reference TEXT,                     -- Batch ID from external system
  paid_confirmed_by UUID REFERENCES profiles(id),
  paid_confirmed_at TIMESTAMPTZ,
  
  notes TEXT,
  
  UNIQUE(company_id, period_start_date, period_end_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payroll_runs_company ON payroll_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON payroll_runs(period_start_date, period_end_date);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);

-- RLS
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_company_payroll_runs" ON payroll_runs FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "manage_payroll_runs" ON payroll_runs FOR ALL
USING (company_id IN (
  SELECT company_id FROM profiles 
  WHERE auth_user_id = auth.uid() 
  AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner')
));

-- 4. CREATE PAYROLL_ENTRIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS payroll_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Employee snapshot (in case details change later)
  employee_name TEXT NOT NULL,
  employee_payroll_id TEXT,
  pay_type TEXT NOT NULL,
  
  -- Hours breakdown
  regular_hours DECIMAL(6,2) DEFAULT 0,
  overtime_hours DECIMAL(6,2) DEFAULT 0,
  holiday_hours DECIMAL(6,2) DEFAULT 0,
  sick_hours DECIMAL(6,2) DEFAULT 0,
  total_hours DECIMAL(6,2) NOT NULL,
  
  -- Rates
  hourly_rate DECIMAL(6,2),
  overtime_rate DECIMAL(6,2),
  
  -- Pay calculations (estimates - accounting package recalculates)
  regular_pay DECIMAL(10,2) DEFAULT 0,
  overtime_pay DECIMAL(10,2) DEFAULT 0,
  holiday_pay DECIMAL(10,2) DEFAULT 0,
  sick_pay DECIMAL(10,2) DEFAULT 0,
  gross_pay DECIMAL(10,2) NOT NULL,
  
  -- Deductions (estimates for display)
  estimated_paye DECIMAL(8,2) DEFAULT 0,
  estimated_employee_ni DECIMAL(8,2) DEFAULT 0,
  estimated_employee_pension DECIMAL(8,2) DEFAULT 0,
  estimated_student_loan DECIMAL(8,2) DEFAULT 0,
  estimated_net_pay DECIMAL(10,2),
  
  -- Employer costs (these are real costs to budget)
  employer_ni DECIMAL(8,2) DEFAULT 0,
  employer_pension DECIMAL(8,2) DEFAULT 0,
  holiday_accrual DECIMAL(8,2) DEFAULT 0,
  total_employer_cost DECIMAL(10,2) NOT NULL,
  
  -- Flags
  is_trial_shift BOOLEAN DEFAULT false,
  trial_shift_approved BOOLEAN DEFAULT false,
  is_salaried BOOLEAN DEFAULT false,
  has_adjustments BOOLEAN DEFAULT false,
  adjustment_notes TEXT,
  
  -- Source data links
  attendance_ids UUID[],                     -- Which attendance records included
  signoff_ids UUID[],                        -- Which signoffs included
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payroll_entries_run ON payroll_entries(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_employee ON payroll_entries(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_company ON payroll_entries(company_id);

-- RLS
ALTER TABLE payroll_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_company_payroll_entries" ON payroll_entries FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "manage_payroll_entries" ON payroll_entries FOR ALL
USING (company_id IN (
  SELECT company_id FROM profiles 
  WHERE auth_user_id = auth.uid() 
  AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner')
));

-- 5. CREATE HOLIDAY_ACCRUALS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS holiday_accruals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Holiday year (April-March in UK, or custom)
  year_start DATE NOT NULL,
  year_end DATE NOT NULL,
  
  -- Entitlement
  annual_entitlement_days DECIMAL(5,2) NOT NULL DEFAULT 28,  -- UK minimum 28 days (5.6 weeks)
  carried_over_days DECIMAL(5,2) DEFAULT 0,
  
  -- Accrued (for irregular hours workers - 12.07% method)
  hours_worked DECIMAL(10,2) DEFAULT 0,
  holiday_hours_accrued DECIMAL(8,2) DEFAULT 0,
  holiday_hours_taken DECIMAL(8,2) DEFAULT 0,
  holiday_hours_remaining DECIMAL(8,2) GENERATED ALWAYS AS (
    holiday_hours_accrued + (carried_over_days * 8) - holiday_hours_taken
  ) STORED,
  
  -- Money values
  accrual_value DECIMAL(10,2) DEFAULT 0,     -- £ value of accrued holiday
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(company_id, employee_id, year_start)
);

-- RLS
ALTER TABLE holiday_accruals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_own_holiday" ON holiday_accruals FOR SELECT
USING (
  employee_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
  OR company_id IN (
    SELECT company_id FROM profiles 
    WHERE auth_user_id = auth.uid() 
    AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner', 'manager')
  )
);

CREATE POLICY "manage_holiday_accruals" ON holiday_accruals FOR ALL
USING (company_id IN (
  SELECT company_id FROM profiles 
  WHERE auth_user_id = auth.uid() 
  AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner')
));

-- 6. CREATE PAYRUN SCHEDULE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS payrun_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Schedule configuration
  pay_period_type TEXT NOT NULL CHECK (pay_period_type IN ('weekly', 'fortnightly', 'monthly')),
  period_start_day INTEGER CHECK (period_start_day BETWEEN 1 AND 7),  -- 1=Monday, 7=Sunday (for weekly/fortnightly)
  period_start_date INTEGER CHECK (period_start_date BETWEEN 1 AND 28),  -- Day of month (for monthly)
  days_after_period_end INTEGER DEFAULT 5,  -- Days after period end to pay date
  
  -- Auto-generation settings
  auto_generate BOOLEAN DEFAULT false,
  generate_days_before INTEGER DEFAULT 3,  -- Generate payroll X days before pay date
  
  -- Scope
  site_ids UUID[],  -- NULL = all sites, otherwise specific sites
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(company_id, pay_period_type)
);

-- RLS
ALTER TABLE payrun_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_company_payrun_schedules" ON payrun_schedules FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "manage_payrun_schedules" ON payrun_schedules FOR ALL
USING (company_id IN (
  SELECT company_id FROM profiles 
  WHERE auth_user_id = auth.uid() 
  AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner')
));

-- Done!
SELECT 'Payroll tables created successfully!' as result;

