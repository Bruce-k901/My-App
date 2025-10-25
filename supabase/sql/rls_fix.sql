-- Comprehensive RLS Fix Script
-- This script fixes common RLS issues that cause timeouts

-- 1. Ensure RLS is enabled on all critical tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temperature_logs ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS companies_select_own_or_profile ON public.companies;
DROP POLICY IF EXISTS companies_insert_own ON public.companies;
DROP POLICY IF EXISTS companies_update_own_or_profile ON public.companies;
DROP POLICY IF EXISTS sites_select_company ON public.sites;
DROP POLICY IF EXISTS sites_insert_company ON public.sites;
DROP POLICY IF EXISTS sites_update_company ON public.sites;
DROP POLICY IF EXISTS contractors_select_company ON public.contractors;
DROP POLICY IF EXISTS contractors_insert_company ON public.contractors;
DROP POLICY IF EXISTS contractors_update_company ON public.contractors;
DROP POLICY IF EXISTS assets_select_company ON public.assets;
DROP POLICY IF EXISTS assets_insert_company ON public.assets;
DROP POLICY IF EXISTS assets_update_company ON public.assets;
DROP POLICY IF EXISTS assets_delete_company ON public.assets;

-- 3. Create simplified, working RLS policies

-- Profiles: Users can only access their own profile
CREATE POLICY profiles_own_data
  ON public.profiles
  FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Companies: Users can access companies they're linked to via profile
CREATE POLICY companies_user_access
  ON public.companies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = companies.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = companies.id
    )
  );

-- Sites: Users can access sites in their company
CREATE POLICY sites_company_access
  ON public.sites
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = sites.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = sites.company_id
        AND LOWER(p.app_role) IN ('owner', 'admin')
    )
  );

-- Assets: Users can access assets in their company
CREATE POLICY assets_company_access
  ON public.assets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = assets.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = assets.company_id
        AND LOWER(p.app_role) IN ('owner', 'admin', 'manager')
    )
  );

-- Contractors: Users can access contractors in their company
CREATE POLICY contractors_company_access
  ON public.contractors
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = contractors.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = contractors.company_id
        AND LOWER(p.app_role) IN ('owner', 'admin', 'manager')
    )
  );

-- Tasks: Users can access tasks in their company
CREATE POLICY tasks_company_access
  ON public.tasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = tasks.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = tasks.company_id
    )
  );

-- Incidents: Users can access incidents in their company
CREATE POLICY incidents_company_access
  ON public.incidents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = incidents.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = incidents.company_id
    )
  );

-- Temperature logs: Users can access temperature logs in their company
CREATE POLICY temperature_logs_company_access
  ON public.temperature_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = temperature_logs.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = temperature_logs.company_id
    )
  );

-- 4. Create helpful indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles (company_id);
CREATE INDEX IF NOT EXISTS idx_sites_company_id ON public.sites (company_id);
CREATE INDEX IF NOT EXISTS idx_assets_company_id ON public.assets (company_id);
CREATE INDEX IF NOT EXISTS idx_contractors_company_id ON public.contractors (company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON public.tasks (company_id);
CREATE INDEX IF NOT EXISTS idx_incidents_company_id ON public.incidents (company_id);
CREATE INDEX IF NOT EXISTS idx_temperature_logs_company_id ON public.temperature_logs (company_id);

-- 5. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
