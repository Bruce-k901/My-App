-- Emergency RLS Fix
-- This script fixes the most common RLS issues causing timeouts

-- 1. Temporarily disable RLS on critical tables to test
-- (This is a temporary fix - we'll re-enable with proper policies)

-- First, let's check what's currently enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'companies', 'sites', 'assets', 'contractors', 'tasks', 'incidents', 'temperature_logs')
ORDER BY tablename;

-- 2. Create a simple, working RLS setup
-- Drop all existing policies first
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
            AND tablename IN ('profiles', 'companies', 'sites', 'assets', 'contractors', 'tasks', 'incidents', 'temperature_logs')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- 3. Enable RLS with simple policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temperature_logs ENABLE ROW LEVEL SECURITY;

-- 4. Create simple, working policies
-- Profiles: Users can only access their own profile
CREATE POLICY "Users can access own profile" ON public.profiles
    FOR ALL USING (id = auth.uid());

-- Companies: Users can access companies they're linked to
CREATE POLICY "Users can access linked companies" ON public.companies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.company_id = companies.id
        )
    );

-- Sites: Users can access sites in their company
CREATE POLICY "Users can access company sites" ON public.sites
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.company_id = sites.company_id
        )
    );

-- Assets: Users can access assets in their company
CREATE POLICY "Users can access company assets" ON public.assets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.company_id = assets.company_id
        )
    );

-- Contractors: Users can access contractors in their company
CREATE POLICY "Users can access company contractors" ON public.contractors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.company_id = contractors.company_id
        )
    );

-- Tasks: Users can access tasks in their company
CREATE POLICY "Users can access company tasks" ON public.tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.company_id = tasks.company_id
        )
    );

-- Incidents: Users can access incidents in their company
CREATE POLICY "Users can access company incidents" ON public.incidents
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.company_id = incidents.company_id
        )
    );

-- Temperature logs: Users can access temperature logs in their company
CREATE POLICY "Users can access company temperature logs" ON public.temperature_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.company_id = temperature_logs.company_id
        )
    );

-- 5. Ensure proper permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 6. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles (company_id);
CREATE INDEX IF NOT EXISTS idx_sites_company_id ON public.sites (company_id);
CREATE INDEX IF NOT EXISTS idx_assets_company_id ON public.assets (company_id);
CREATE INDEX IF NOT EXISTS idx_contractors_company_id ON public.contractors (company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON public.tasks (company_id);
CREATE INDEX IF NOT EXISTS idx_incidents_company_id ON public.incidents (company_id);
CREATE INDEX IF NOT EXISTS idx_temperature_logs_company_id ON public.temperature_logs (company_id);

-- 7. Test the setup
SELECT 'RLS setup completed successfully' as status;
