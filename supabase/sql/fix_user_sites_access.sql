-- Fix User Sites Access
-- This script diagnoses and fixes the RLS issue preventing site access

-- Step 1: Check current user's profile
SELECT 
  '=== CURRENT USER PROFILE ===' as section,
  id as profile_id,
  auth_user_id,
  full_name,
  email,
  company_id,
  app_role,
  CASE 
    WHEN id = auth.uid() THEN '✅ id matches auth.uid()'
    WHEN auth_user_id = auth.uid() THEN '✅ auth_user_id matches auth.uid()'
    ELSE '❌ Neither id nor auth_user_id matches auth.uid()'
  END as auth_match_status
FROM profiles
WHERE id = auth.uid() OR auth_user_id = auth.uid()
LIMIT 1;

-- Step 2: Check what sites should be accessible
SELECT 
  '=== SITES THAT SHOULD BE ACCESSIBLE ===' as section,
  s.id,
  s.name,
  s.company_id,
  p.company_id as user_company_id,
  CASE 
    WHEN s.company_id = p.company_id THEN '✅ Company matches'
    ELSE '❌ Company mismatch'
  END as company_match
FROM sites s
CROSS JOIN (
  SELECT company_id 
  FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1
) p
WHERE s.company_id = p.company_id
LIMIT 10;

-- Step 3: Drop all existing sites policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'sites'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.sites', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Step 4: Ensure RLS is enabled
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Step 5: Create simple SELECT policy that works with both id and auth_user_id
CREATE POLICY sites_select_by_company ON public.sites
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
  );

-- Step 6: Create INSERT policy
CREATE POLICY sites_insert_by_company ON public.sites
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
  );

-- Step 7: Create UPDATE policy
CREATE POLICY sites_update_by_company ON public.sites
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
  );

-- Step 8: Create DELETE policy (admins/owners only)
CREATE POLICY sites_delete_by_company ON public.sites
  FOR DELETE
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
        AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner')
    )
  );

-- Step 9: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sites TO authenticated;

-- Step 10: Verify the fix worked
SELECT 
  '=== VERIFICATION ===' as section,
  COUNT(*) as accessible_sites_count
FROM sites
WHERE company_id IN (
  SELECT company_id 
  FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
);

-- Step 11: Show final policies
SELECT 
  '=== FINAL POLICIES ===' as section,
  policyname,
  cmd,
  'Policy active' as status
FROM pg_policies
WHERE tablename = 'sites'
ORDER BY policyname;

