-- =====================================================
-- JOBS TABLE
-- Job postings for recruitment
-- =====================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN

    CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Job Details
  title TEXT NOT NULL,
  description TEXT,
  department TEXT,
  job_type TEXT CHECK (job_type IN ('full_time', 'part_time', 'contract', 'temporary', 'casual')),
  
  -- Location
  location TEXT,
  remote_allowed BOOLEAN DEFAULT false,
  
  -- Compensation (optional)
  salary_min DECIMAL(10,2),
  salary_max DECIMAL(10,2),
  salary_currency TEXT DEFAULT 'GBP',
  salary_display TEXT, -- e.g., "£25,000 - £30,000" or "Competitive"
  
  -- Status & Dates
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'filled', 'cancelled')),
  posted_date DATE,
  closing_date DATE,
  filled_date DATE,
  
  -- Requirements
  requirements TEXT,
  qualifications TEXT,
  experience_required TEXT,
  
  -- Application Info
  application_email TEXT,
  application_url TEXT,
  application_method TEXT CHECK (application_method IN ('email', 'url', 'internal')),
  
  -- Internal Tracking
  hiring_manager_id UUID REFERENCES profiles(id),
  number_of_positions INTEGER DEFAULT 1,
  
  -- Metadata
  views_count INTEGER DEFAULT 0,
  applications_count INTEGER DEFAULT 0,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_company_status ON jobs(company_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_date ON jobs(posted_date);
CREATE INDEX IF NOT EXISTS idx_jobs_closing_date ON jobs(closing_date);
CREATE INDEX IF NOT EXISTS idx_jobs_site ON jobs(site_id);

    -- Updated_at trigger
    CREATE OR REPLACE FUNCTION update_jobs_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_update_jobs_updated_at
      BEFORE UPDATE ON jobs
      FOR EACH ROW
      EXECUTE FUNCTION update_jobs_updated_at();

    -- RLS
    ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "view_open_jobs" ON jobs;
    DROP POLICY IF EXISTS "managers_view_jobs" ON jobs;
    DROP POLICY IF EXISTS "managers_manage_jobs" ON jobs;

    -- Employees can view open jobs in their company
    CREATE POLICY "view_open_jobs"
    ON jobs FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid()
      )
      AND status = 'open'
    );

    -- Managers can view all jobs in their company
    CREATE POLICY "managers_view_jobs"
    ON jobs FOR SELECT
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role) IN ('admin', 'owner', 'manager')
      )
    );

    -- Managers can manage jobs
    CREATE POLICY "managers_manage_jobs"
    ON jobs FOR ALL
    USING (
      company_id IN (
        SELECT company_id FROM profiles 
        WHERE auth_user_id = auth.uid() 
        AND LOWER(app_role) IN ('admin', 'owner', 'manager')
      )
    );

    RAISE NOTICE 'Created jobs table with RLS policies';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, profiles, sites) do not exist yet - skipping jobs table creation';
  END IF;
END $$;

