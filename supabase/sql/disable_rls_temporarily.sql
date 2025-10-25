-- Temporarily disable RLS for testing
-- WARNING: This removes security - only use for debugging!

-- Disable RLS on all tables
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractors DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.temperature_logs DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('profiles', 'companies', 'sites', 'assets', 'contractors', 'tasks', 'incidents', 'temperature_logs')
ORDER BY tablename;

SELECT 'RLS temporarily disabled for testing' as status;
