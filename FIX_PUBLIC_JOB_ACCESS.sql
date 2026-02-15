-- =====================================================
-- FIX PUBLIC ACCESS TO PUBLISHED JOBS
-- =====================================================
-- This fixes the 401 error when accessing public job pages
-- The issue: RLS policy wasn't explicitly allowing anonymous users

-- Drop the old policy
DROP POLICY IF EXISTS "public_can_view_published_jobs" ON public.jobs;

-- Recreate with explicit TO clause for anonymous and authenticated users
CREATE POLICY "public_can_view_published_jobs"
ON public.jobs FOR SELECT
TO anon, authenticated
USING (is_published = true AND status = 'open');

-- Test the policy (should return published jobs)
-- SELECT id, title, is_published, status FROM public.jobs WHERE is_published = true AND status = 'open';

-- =====================================================
-- ALSO FIX COMPANIES TABLE ACCESS
-- =====================================================
-- Public job pages need to read company names via the foreign key relationship

-- Check if companies table has RLS enabled
DO $$ 
BEGIN
  -- Enable RLS if not already enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'companies' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop old public policy if exists
DROP POLICY IF EXISTS "public_can_view_company_names" ON public.companies;

-- Allow public to view company names (for job listings)
CREATE POLICY "public_can_view_company_names"
ON public.companies FOR SELECT
TO anon, authenticated
USING (true); -- Allow reading company names for all companies

-- Note: This only allows SELECT (reading). Companies can't be created/modified by public.

RAISE NOTICE '✅ Public job access fixed! Anonymous users can now view published jobs and company names.';
