-- ============================================================================
-- Migration: 20250215000000_add_employee_fields_to_profiles.sql
-- Description: Add comprehensive employee fields to profiles table
-- This includes personal, employment, compliance, banking, and leave fields
-- ============================================================================

-- Personal Information Fields
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    -- Personal Information
    ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS date_of_birth DATE,
    ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say', 'other') OR gender IS NULL),
    ADD COLUMN IF NOT EXISTS nationality TEXT,
    ADD COLUMN IF NOT EXISTS address_line_1 TEXT,
    ADD COLUMN IF NOT EXISTS address_line_2 TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS county TEXT,
    ADD COLUMN IF NOT EXISTS postcode TEXT,
    ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'United Kingdom',
    ADD COLUMN IF NOT EXISTS emergency_contacts JSONB;

    -- Employment Fields
    ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS employee_number TEXT,
    ADD COLUMN IF NOT EXISTS department TEXT,
    ADD COLUMN IF NOT EXISTS reports_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS start_date DATE,
    ADD COLUMN IF NOT EXISTS probation_end_date DATE,
    ADD COLUMN IF NOT EXISTS contract_type TEXT CHECK (contract_type IN ('permanent', 'fixed_term', 'zero_hours', 'casual', 'agency', 'contractor', 'apprentice') OR contract_type IS NULL) DEFAULT 'permanent',
    ADD COLUMN IF NOT EXISTS hourly_rate INTEGER, -- Stored in pence
    ADD COLUMN IF NOT EXISTS salary NUMERIC(10,2), -- Annual salary in pounds
    ADD COLUMN IF NOT EXISTS pay_frequency TEXT CHECK (pay_frequency IN ('weekly', 'fortnightly', 'four_weekly', 'monthly') OR pay_frequency IS NULL) DEFAULT 'monthly',
    ADD COLUMN IF NOT EXISTS notice_period_weeks INTEGER DEFAULT 1;

    -- Compliance Fields
    ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS national_insurance_number TEXT,
    ADD COLUMN IF NOT EXISTS right_to_work_status TEXT CHECK (right_to_work_status IN ('pending', 'verified', 'expired', 'not_required') OR right_to_work_status IS NULL) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS right_to_work_expiry DATE,
    ADD COLUMN IF NOT EXISTS right_to_work_document_type TEXT CHECK (right_to_work_document_type IN ('passport', 'biometric_residence_permit', 'share_code', 'visa', 'other') OR right_to_work_document_type IS NULL),
    ADD COLUMN IF NOT EXISTS dbs_status TEXT CHECK (dbs_status IN ('not_required', 'pending', 'clear', 'issues_found') OR dbs_status IS NULL) DEFAULT 'not_required',
    ADD COLUMN IF NOT EXISTS dbs_certificate_number TEXT,
    ADD COLUMN IF NOT EXISTS dbs_check_date DATE;

    -- Banking Fields
    ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS bank_name TEXT,
    ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
    ADD COLUMN IF NOT EXISTS bank_sort_code TEXT,
    ADD COLUMN IF NOT EXISTS bank_account_number TEXT;

    -- Leave Fields
    ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS annual_leave_allowance NUMERIC(4,1) DEFAULT 28;

    -- Additional Employment Fields
    ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS p45_date DATE, -- Date P45 was issued
    ADD COLUMN IF NOT EXISTS p45_reference TEXT, -- P45 reference number
    ADD COLUMN IF NOT EXISTS p45_received BOOLEAN DEFAULT false; -- Whether P45 has been received

    -- Pay & Tax Fields
    ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS tax_code TEXT,
    ADD COLUMN IF NOT EXISTS student_loan BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS student_loan_plan TEXT,
    ADD COLUMN IF NOT EXISTS pension_enrolled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS pension_contribution_percent NUMERIC(5,2); -- Percentage contribution

    -- Create indexes for commonly queried fields
    CREATE INDEX IF NOT EXISTS idx_profiles_employee_number ON public.profiles(employee_number) WHERE employee_number IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_profiles_department ON public.profiles(department) WHERE department IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_profiles_reports_to ON public.profiles(reports_to) WHERE reports_to IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_profiles_contract_type ON public.profiles(contract_type);
    CREATE INDEX IF NOT EXISTS idx_profiles_start_date ON public.profiles(start_date) WHERE start_date IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_profiles_rtw_expiry ON public.profiles(right_to_work_expiry) WHERE right_to_work_expiry IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_profiles_dbs_check_date ON public.profiles(dbs_check_date) WHERE dbs_check_date IS NOT NULL;

  ELSE
    RAISE NOTICE '⚠️ profiles table does not exist yet - skipping employee field additions';
  END IF;
END $$;

-- Note: contracted_hours_per_week should already exist from staff_scheduling_requirements migration
-- If it doesn't exist, this will add it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'contracted_hours_per_week') THEN
      ALTER TABLE public.profiles
      ADD COLUMN contracted_hours_per_week DECIMAL(4,1);
    END IF;
  END IF;
END $$;
