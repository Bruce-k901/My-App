-- =====================================================
-- PAY RATES TABLE
-- Employee compensation rates
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    CREATE TABLE IF NOT EXISTS pay_rates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL,
      profile_id UUID NOT NULL,
      
      -- Pay type
      pay_type TEXT NOT NULL DEFAULT 'hourly',
      -- Values: 'hourly', 'salary', 'daily'
      
      -- Rates (in pence/cents for precision)
      base_rate INTEGER NOT NULL,
      -- For hourly: rate per hour in pence
      -- For salary: annual salary in pence
      -- For daily: day rate in pence
      
      currency TEXT DEFAULT 'GBP',
      
      -- Overtime rates
      overtime_rate INTEGER,
      -- Rate for OT hours (null = same as base)
      
      overtime_multiplier DECIMAL(3,2) DEFAULT 1.5,
      -- Alternative: multiplier on base rate
      
      weekend_rate INTEGER,
      weekend_multiplier DECIMAL(3,2) DEFAULT 1.25,
      
      bank_holiday_rate INTEGER,
      bank_holiday_multiplier DECIMAL(3,2) DEFAULT 2.0,
      
      -- Working hours (for salary calculations)
      contracted_hours_per_week DECIMAL(4,1) DEFAULT 40,
      
      -- Effective dates
      effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
      effective_to DATE,
      
      -- Status
      is_current BOOLEAN DEFAULT true,
      
      -- Audit
      created_by UUID,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    -- Add foreign key constraints
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'pay_rates' 
      AND constraint_name LIKE '%company_id%'
    ) THEN
      ALTER TABLE pay_rates 
      ADD CONSTRAINT pay_rates_company_id_fkey 
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'pay_rates' 
      AND constraint_name LIKE '%profile_id%'
    ) THEN
      ALTER TABLE pay_rates 
      ADD CONSTRAINT pay_rates_profile_id_fkey 
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE table_schema = 'public' 
      AND table_name = 'pay_rates' 
      AND constraint_name LIKE '%created_by%'
    ) THEN
      ALTER TABLE pay_rates 
      ADD CONSTRAINT pay_rates_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES profiles(id);
    END IF;

    CREATE INDEX IF NOT EXISTS idx_pay_rates_profile ON pay_rates(profile_id);
    CREATE INDEX IF NOT EXISTS idx_pay_rates_current ON pay_rates(profile_id, is_current) WHERE is_current = true;
    CREATE INDEX IF NOT EXISTS idx_pay_rates_effective ON pay_rates(profile_id, effective_from, effective_to);

    -- Only one current rate per employee
    CREATE UNIQUE INDEX IF NOT EXISTS idx_one_current_rate 
    ON pay_rates(profile_id)
    WHERE is_current = true;

    -- RLS
    ALTER TABLE pay_rates ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "admin_view_pay_rates" ON pay_rates;
    DROP POLICY IF EXISTS "view_own_rate" ON pay_rates;
    DROP POLICY IF EXISTS "admin_manage_pay_rates" ON pay_rates;

    -- Only admins/owners can see pay rates
    CREATE POLICY "admin_view_pay_rates"
    ON pay_rates FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role) IN ('admin', 'owner')
      )
    );

    -- Employees can see their own current rate
    CREATE POLICY "view_own_rate"
    ON pay_rates FOR SELECT
    USING (
      profile_id IN (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
      AND is_current = true
    );

    CREATE POLICY "admin_manage_pay_rates"
    ON pay_rates FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role) IN ('admin', 'owner')
      )
    );

    RAISE NOTICE 'Created pay_rates table with RLS policies';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, profiles) do not exist yet - skipping pay_rates table creation';
  END IF;
END $$;

-- =====================================================
-- UPDATE PAY RATE FUNCTION
-- Handles rate changes properly
-- =====================================================

CREATE OR REPLACE FUNCTION update_pay_rate(
  p_profile_id UUID,
  p_pay_type TEXT,
  p_base_rate INTEGER,
  p_effective_from DATE DEFAULT CURRENT_DATE,
  p_overtime_multiplier DECIMAL DEFAULT 1.5,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $function$
DECLARE
  v_rate_id UUID;
  v_company_id UUID;
BEGIN
  -- Check if required tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pay_rates')
     OR NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    RETURN NULL;
  END IF;

  SELECT company_id INTO v_company_id FROM profiles WHERE id = p_profile_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
  
  -- End current rate
  UPDATE pay_rates SET
    is_current = false,
    effective_to = p_effective_from - 1,
    updated_at = now()
  WHERE profile_id = p_profile_id AND is_current = true;
  
  -- Create new rate
  INSERT INTO pay_rates (
    company_id, profile_id, pay_type, base_rate,
    overtime_multiplier, effective_from, is_current, created_by
  ) VALUES (
    v_company_id, p_profile_id, p_pay_type, p_base_rate,
    p_overtime_multiplier, p_effective_from, true, p_created_by
  )
  RETURNING id INTO v_rate_id;
  
  RETURN v_rate_id;
END;
$function$ LANGUAGE plpgsql;

