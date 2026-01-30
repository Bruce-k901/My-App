-- =====================================================
-- FORCE FIX: PUBLIC ACCESS TO COMPANIES TABLE
-- =====================================================

-- First, check if RLS is enabled on companies
DO $$ 
BEGIN
  RAISE NOTICE 'Checking companies table RLS status...';
END $$;

-- Ensure RLS is enabled
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing SELECT policies on companies (to avoid conflicts)
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'companies' 
    AND schemaname = 'public'
    AND cmd = 'SELECT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.companies', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- Create simple public read policy
CREATE POLICY "allow_public_read_companies"
ON public.companies FOR SELECT
TO anon, authenticated
USING (true);

-- Also ensure jobs table policy is correct
DROP POLICY IF EXISTS "public_can_view_published_jobs" ON public.jobs;

CREATE POLICY "public_can_view_published_jobs"
ON public.jobs FOR SELECT
TO anon, authenticated
USING (is_published = true AND status = 'open');

-- Verify the policies exist
DO $$ 
BEGIN
  RAISE NOTICE '✅ Policies created. Verifying...';
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'companies' 
    AND policyname = 'allow_public_read_companies'
  ) THEN
    RAISE NOTICE '✅ Companies public read policy EXISTS';
  ELSE
    RAISE NOTICE '❌ Companies public read policy MISSING';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'jobs' 
    AND policyname = 'public_can_view_published_jobs'
  ) THEN
    RAISE NOTICE '✅ Jobs public read policy EXISTS';
  ELSE
    RAISE NOTICE '❌ Jobs public read policy MISSING';
  END IF;
  
  RAISE NOTICE '🎉 Public access fix complete!';
END $$;
