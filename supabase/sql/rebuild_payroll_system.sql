-- =====================================================
-- REBUILT PAYROLL SYSTEM - FLEXIBLE SCHEDULES
-- =====================================================
-- Supports: 13 periods/year, last Friday, last day, weekly, fortnightly, monthly

-- 1. DROP OLD TABLES (if they exist)
-- =====================================================
DROP FUNCTION IF EXISTS create_payroll_run_from_signoff CASCADE;
DROP TABLE IF EXISTS payroll_entries CASCADE;
DROP TABLE IF EXISTS payroll_runs CASCADE;
DROP TABLE IF EXISTS payrun_schedules CASCADE;

-- 2. FLEXIBLE PAYRUN SCHEDULES
-- =====================================================
CREATE TABLE payrun_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Schedule Type
  schedule_type TEXT NOT NULL CHECK (schedule_type IN (
    'weekly',           -- Every week (e.g., every Monday)
    'fortnightly',      -- Every 2 weeks
    'monthly',          -- Monthly (specific day or last day)
    'four_weekly',      -- 13 periods per year (every 4 weeks)
    'last_friday',      -- Last Friday of each month
    'last_day'          -- Last day of each month
  )),
  
  -- For weekly/fortnightly/four_weekly: which day of week
  period_start_day INTEGER CHECK (period_start_day BETWEEN 1 AND 7),  -- 1=Monday, 7=Sunday
  
  -- For monthly: which day of month (1-28) or NULL for last day
  period_start_date INTEGER CHECK (period_start_date BETWEEN 1 AND 28),
  
  -- Pay date calculation
  pay_date_type TEXT NOT NULL DEFAULT 'days_after' CHECK (pay_date_type IN (
    'days_after',       -- X days after period end
    'same_day_next_week', -- Same day of week, next week
    'last_friday',      -- Last Friday of month
    'last_day'          -- Last day of month
  )),
  days_after_period_end INTEGER DEFAULT 5,  -- For 'days_after' type
  
  -- Auto-generation
  auto_generate BOOLEAN DEFAULT false,
  generate_days_before INTEGER DEFAULT 3,
  
  -- Scope
  site_ids UUID[],  -- NULL = all sites
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(company_id, schedule_type)
);

CREATE INDEX idx_payrun_schedules_company ON payrun_schedules(company_id, is_active);

ALTER TABLE payrun_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_company_payrun_schedules" ON payrun_schedules FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "manage_payrun_schedules" ON payrun_schedules FOR ALL
USING (company_id IN (
  SELECT company_id FROM profiles 
  WHERE auth_user_id = auth.uid() 
  AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner')
));

-- 3. PAYROLL RUNS (with weekly breakdown support)
-- =====================================================
CREATE TABLE payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Period info
  pay_period_type TEXT NOT NULL CHECK (pay_period_type IN ('weekly', 'fortnightly', 'monthly', 'four_weekly')),
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  pay_date DATE NOT NULL,
  
  -- Weekly breakdown (for periods longer than 1 week)
  week_1_start DATE,
  week_1_end DATE,
  week_2_start DATE,
  week_2_end DATE,
  week_3_start DATE,
  week_3_end DATE,
  week_4_start DATE,
  week_4_end DATE,
  
  -- Scope
  site_ids UUID[] DEFAULT NULL,
  
  -- Totals
  total_employees INTEGER NOT NULL DEFAULT 0,
  total_hours DECIMAL(10,2) DEFAULT 0,
  total_gross_pay DECIMAL(12,2) DEFAULT 0,
  total_employer_ni DECIMAL(10,2) DEFAULT 0,
  total_employer_pension DECIMAL(10,2) DEFAULT 0,
  total_holiday_accrual DECIMAL(10,2) DEFAULT 0,
  total_employer_cost DECIMAL(12,2) DEFAULT 0,
  total_tronc DECIMAL(10,2) DEFAULT 0,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_review', 'approved', 'exported', 'paid'
  )),
  
  -- Workflow
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  exported_at TIMESTAMPTZ,
  export_format TEXT,
  export_reference TEXT,
  paid_confirmed_by UUID REFERENCES profiles(id),
  paid_confirmed_at TIMESTAMPTZ,
  
  notes TEXT,
  
  UNIQUE(company_id, period_start_date, period_end_date)
);

CREATE INDEX idx_payroll_runs_company ON payroll_runs(company_id);
CREATE INDEX idx_payroll_runs_period ON payroll_runs(period_start_date, period_end_date);
CREATE INDEX idx_payroll_runs_status ON payroll_runs(status);

ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_company_payroll_runs" ON payroll_runs FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "manage_payroll_runs" ON payroll_runs FOR ALL
USING (company_id IN (
  SELECT company_id FROM profiles 
  WHERE auth_user_id = auth.uid() 
  AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner')
));

-- 4. PAYROLL ENTRIES (with weekly breakdown)
-- =====================================================
CREATE TABLE payroll_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Employee snapshot
  employee_name TEXT NOT NULL,
  employee_payroll_id TEXT,
  pay_type TEXT NOT NULL CHECK (pay_type IN ('hourly', 'salaried', 'zero_hours')),
  
  -- Weekly breakdown (for periods > 1 week)
  week_1_hours DECIMAL(6,2) DEFAULT 0,
  week_2_hours DECIMAL(6,2) DEFAULT 0,
  week_3_hours DECIMAL(6,2) DEFAULT 0,
  week_4_hours DECIMAL(6,2) DEFAULT 0,
  
  -- Hours breakdown
  regular_hours DECIMAL(6,2) DEFAULT 0,
  overtime_hours DECIMAL(6,2) DEFAULT 0,
  holiday_hours DECIMAL(6,2) DEFAULT 0,
  sick_hours DECIMAL(6,2) DEFAULT 0,
  total_hours DECIMAL(6,2) NOT NULL,
  
  -- Rates
  hourly_rate DECIMAL(6,2),
  overtime_rate DECIMAL(6,2),
  annual_salary DECIMAL(10,2),  -- For salaried
  pay_periods_per_year INTEGER, -- For salaried calculation (12, 13, 26, 52, etc.)
  
  -- Pay calculations
  regular_pay DECIMAL(10,2) DEFAULT 0,
  overtime_pay DECIMAL(10,2) DEFAULT 0,
  holiday_pay DECIMAL(10,2) DEFAULT 0,
  sick_pay DECIMAL(10,2) DEFAULT 0,
  salaried_pay DECIMAL(10,2) DEFAULT 0,  -- For salaried staff
  gross_pay DECIMAL(10,2) NOT NULL,
  
  -- Deductions (estimates)
  estimated_paye DECIMAL(8,2) DEFAULT 0,
  estimated_employee_ni DECIMAL(8,2) DEFAULT 0,
  estimated_employee_pension DECIMAL(8,2) DEFAULT 0,
  estimated_student_loan DECIMAL(8,2) DEFAULT 0,
  estimated_net_pay DECIMAL(10,2),
  
  -- Employer costs
  employer_ni DECIMAL(8,2) DEFAULT 0,
  employer_pension DECIMAL(8,2) DEFAULT 0,
  holiday_accrual DECIMAL(8,2) DEFAULT 0,
  total_employer_cost DECIMAL(10,2) NOT NULL,
  
  -- Tronc/Tips
  tronc_points DECIMAL(6,2) DEFAULT 0,
  tronc_value DECIMAL(8,2) DEFAULT 0,
  
  -- Flags
  is_trial_shift BOOLEAN DEFAULT false,
  trial_shift_approved BOOLEAN DEFAULT false,
  is_salaried BOOLEAN DEFAULT false,
  has_adjustments BOOLEAN DEFAULT false,
  adjustment_notes TEXT,
  
  -- Source data
  attendance_ids UUID[],
  signoff_ids UUID[],
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payroll_entries_run ON payroll_entries(payroll_run_id);
CREATE INDEX idx_payroll_entries_employee ON payroll_entries(employee_id);
CREATE INDEX idx_payroll_entries_company ON payroll_entries(company_id);

ALTER TABLE payroll_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_company_payroll_entries" ON payroll_entries FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "manage_payroll_entries" ON payroll_entries FOR ALL
USING (company_id IN (
  SELECT company_id FROM profiles 
  WHERE auth_user_id = auth.uid() 
  AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner')
));

-- 5. TRONC POINTS SYSTEM
-- =====================================================
CREATE TABLE tronc_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,  -- NULL = company-wide
  
  -- Point values
  point_value DECIMAL(8,2) NOT NULL DEFAULT 1.00,  -- £ per point
  
  -- Point allocation rules (stored as JSON for flexibility)
  allocation_rules JSONB DEFAULT '{}'::jsonb,  -- e.g., {"role_multipliers": {"manager": 2.0, "supervisor": 1.5}}
  
  -- Period
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  
  -- Total tronc pool
  total_tronc_pool DECIMAL(10,2) DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(company_id, site_id, period_start_date, period_end_date)
);

CREATE INDEX idx_tronc_configs_company ON tronc_configurations(company_id);
CREATE INDEX idx_tronc_configs_period ON tronc_configurations(period_start_date, period_end_date);

ALTER TABLE tronc_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_company_tronc" ON tronc_configurations FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "manage_tronc" ON tronc_configurations FOR ALL
USING (company_id IN (
  SELECT company_id FROM profiles 
  WHERE auth_user_id = auth.uid() 
  AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner')
));

-- 6. HELPER FUNCTION: Calculate pay periods per year
-- =====================================================
CREATE OR REPLACE FUNCTION get_pay_periods_per_year(p_schedule_type TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE p_schedule_type
    WHEN 'weekly' THEN RETURN 52;
    WHEN 'fortnightly' THEN RETURN 26;
    WHEN 'monthly' THEN RETURN 12;
    WHEN 'four_weekly' THEN RETURN 13;
    WHEN 'last_friday' THEN RETURN 12;
    WHEN 'last_day' THEN RETURN 12;
    ELSE RETURN 12;
  END CASE;
END;
$$;

-- 7. HELPER FUNCTION: Calculate next pay date
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_pay_date(
  p_period_end_date DATE,
  p_pay_date_type TEXT,
  p_days_after INTEGER DEFAULT 5
)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_pay_date DATE;
  v_year INTEGER;
  v_month INTEGER;
  v_last_day DATE;
  v_last_friday DATE;
BEGIN
  CASE p_pay_date_type
    WHEN 'days_after' THEN
      RETURN p_period_end_date + (p_days_after || ' days')::INTERVAL;
    
    WHEN 'last_friday' THEN
      -- Get last Friday of the month containing period_end_date
      v_year := EXTRACT(YEAR FROM p_period_end_date);
      v_month := EXTRACT(MONTH FROM p_period_end_date);
      v_last_day := (DATE_TRUNC('month', p_period_end_date) + INTERVAL '1 month - 1 day')::DATE;
      -- Find last Friday
      v_last_friday := v_last_day;
      WHILE EXTRACT(DOW FROM v_last_friday) != 5 LOOP
        v_last_friday := v_last_friday - INTERVAL '1 day';
      END LOOP;
      RETURN v_last_friday;
    
    WHEN 'last_day' THEN
      -- Last day of month containing period_end_date
      v_year := EXTRACT(YEAR FROM p_period_end_date);
      v_month := EXTRACT(MONTH FROM p_period_end_date);
      RETURN (DATE_TRUNC('month', p_period_end_date) + INTERVAL '1 month - 1 day')::DATE;
    
    WHEN 'same_day_next_week' THEN
      RETURN p_period_end_date + INTERVAL '7 days';
    
    ELSE
      RETURN p_period_end_date + (p_days_after || ' days')::INTERVAL;
  END CASE;
END;
$$;

-- Done!
SELECT 'Payroll system rebuilt successfully!' as result;

