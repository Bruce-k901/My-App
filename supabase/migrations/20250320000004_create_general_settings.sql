-- General Settings table for company-wide configuration
-- Uses UPSERT pattern: one row per company_id

-- This migration only runs if required tables exist
DO $$
BEGIN
  -- Check if required tables exist - exit early if they don't
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'companies'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    RAISE NOTICE 'companies or profiles tables do not exist - skipping general_settings migration';
    RETURN;
  END IF;

  EXECUTE $sql_table1$
    CREATE TABLE IF NOT EXISTS general_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Company Info
  company_name TEXT,
  company_logo_url TEXT,
  company_address TEXT,
  company_city TEXT,
  company_postcode TEXT,
  company_country TEXT DEFAULT 'United Kingdom',
  company_phone TEXT,
  company_email TEXT,
  company_website TEXT,
  
  -- Time & Locale
  timezone TEXT DEFAULT 'Europe/London',
  date_format TEXT DEFAULT 'DD/MM/YYYY' CHECK (date_format IN ('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD')),
  time_format TEXT DEFAULT '24h' CHECK (time_format IN ('12h', '24h')),
  week_start_day TEXT DEFAULT 'Monday' CHECK (week_start_day IN ('Monday', 'Sunday')),
  
  -- Working Hours
  default_business_hours JSONB DEFAULT '{"monday": {"open": "09:00", "close": "17:00", "closed": false}, "tuesday": {"open": "09:00", "close": "17:00", "closed": false}, "wednesday": {"open": "09:00", "close": "17:00", "closed": false}, "thursday": {"open": "09:00", "close": "17:00", "closed": false}, "friday": {"open": "09:00", "close": "17:00", "closed": false}, "saturday": {"closed": true}, "sunday": {"closed": true}}'::jsonb,
  standard_shift_length_hours DECIMAL(4,2) DEFAULT 8.00,
  
  -- Pay Periods
  pay_period_type TEXT DEFAULT 'monthly' CHECK (pay_period_type IN ('weekly', 'fortnightly', 'monthly')),
  pay_day TEXT DEFAULT 'last_friday' CHECK (pay_day IN ('last_friday', 'last_monday', 'last_wednesday', 'last_day', 'specific_day')),
  pay_day_specific INTEGER CHECK (pay_day_specific >= 1 AND pay_day_specific <= 31), -- Day of month if pay_day = 'specific_day'
  
  -- Currency
  currency_code TEXT DEFAULT 'GBP' CHECK (currency_code IN ('GBP', 'USD', 'EUR', 'CAD', 'AUD')),
  currency_symbol TEXT DEFAULT '£',
  currency_format TEXT DEFAULT 'symbol_before' CHECK (currency_format IN ('symbol_before', 'symbol_after')),
  
  -- Fiscal Year
  fiscal_year_start_month INTEGER DEFAULT 4 CHECK (fiscal_year_start_month >= 1 AND fiscal_year_start_month <= 12),
  
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  $sql_table1$;

  -- Index for faster lookups
  CREATE INDEX IF NOT EXISTS idx_general_settings_company_id ON general_settings(company_id);

  -- Updated_at trigger
  EXECUTE $sql_func1$
    CREATE OR REPLACE FUNCTION update_general_settings_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func1$;

  -- Create trigger only if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'general_settings') THEN
    DROP TRIGGER IF EXISTS trg_general_settings_updated_at ON general_settings;
    CREATE TRIGGER trg_general_settings_updated_at
      BEFORE UPDATE ON general_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_general_settings_updated_at();
  END IF;

  -- Enable RLS
  ALTER TABLE general_settings ENABLE ROW LEVEL SECURITY;

  -- RLS Policies: Users can only access their company's settings
  DROP POLICY IF EXISTS general_settings_select_company ON general_settings;
  CREATE POLICY general_settings_select_company
    ON general_settings FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.company_id = general_settings.company_id
      )
    );

  DROP POLICY IF EXISTS general_settings_insert_company ON general_settings;
  CREATE POLICY general_settings_insert_company
    ON general_settings FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.company_id = general_settings.company_id
      )
    );

  DROP POLICY IF EXISTS general_settings_update_company ON general_settings;
  CREATE POLICY general_settings_update_company
    ON general_settings FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.company_id = general_settings.company_id
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.company_id = general_settings.company_id
      )
    );

  -- Company-wide planned closures table (similar to site_closures)
  EXECUTE $sql_table2$
    CREATE TABLE IF NOT EXISTS company_closures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      closure_start DATE NOT NULL,
      closure_end DATE NOT NULL,
      notes TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT company_closures_date_range CHECK (closure_end >= closure_start)
    );
  $sql_table2$;

  -- Index for faster lookups
  CREATE INDEX IF NOT EXISTS idx_company_closures_company_id ON company_closures(company_id);
  CREATE INDEX IF NOT EXISTS idx_company_closures_dates ON company_closures(closure_start, closure_end);
  CREATE INDEX IF NOT EXISTS idx_company_closures_active ON company_closures(company_id, is_active) WHERE is_active = true;

  -- Updated_at trigger for company_closures
  EXECUTE $sql_func2$
    CREATE OR REPLACE FUNCTION update_company_closures_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;
  $sql_func2$;

  -- Create trigger only if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'company_closures') THEN
    DROP TRIGGER IF EXISTS trg_company_closures_updated_at ON company_closures;
    CREATE TRIGGER trg_company_closures_updated_at
      BEFORE UPDATE ON company_closures
      FOR EACH ROW
      EXECUTE FUNCTION update_company_closures_updated_at();
  END IF;

  -- Enable RLS for company_closures
  ALTER TABLE company_closures ENABLE ROW LEVEL SECURITY;

  -- RLS Policies: Users can only access their company's closures
  DROP POLICY IF EXISTS company_closures_select_company ON company_closures;
  CREATE POLICY company_closures_select_company
    ON company_closures FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.company_id = company_closures.company_id
      )
    );

  DROP POLICY IF EXISTS company_closures_insert_company ON company_closures;
  CREATE POLICY company_closures_insert_company
    ON company_closures FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.company_id = company_closures.company_id
      )
    );

  DROP POLICY IF EXISTS company_closures_update_company ON company_closures;
  CREATE POLICY company_closures_update_company
    ON company_closures FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.company_id = company_closures.company_id
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.company_id = company_closures.company_id
      )
    );

  DROP POLICY IF EXISTS company_closures_delete_company ON company_closures;
  CREATE POLICY company_closures_delete_company
    ON company_closures FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.company_id = company_closures.company_id
      )
    );

END $$;
