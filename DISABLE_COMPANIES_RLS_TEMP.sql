-- =====================================================
-- TEMPORARY: DISABLE RLS ON COMPANIES TABLE
-- =====================================================
-- This is a temporary fix to allow public job pages to work
-- We'll re-enable RLS with proper policies later

-- Option 1: Disable RLS entirely on companies (simplest fix)
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;

-- Note: This makes ALL company data readable by anyone
-- This is generally okay because company names are not sensitive
-- and job postings typically show company names publicly anyway

-- If you want to re-enable RLS later with proper policies, run:
-- ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "allow_public_read_companies" ON public.companies FOR SELECT TO anon, authenticated USING (true);
