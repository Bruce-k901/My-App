-- Fix Rotas RLS Access
-- This script fixes the RLS issue preventing rota creation/updates

-- Step 1: Check current user's profile and company
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

-- Step 2: Check what rotas should be accessible
SELECT 
  '=== ROTAS THAT SHOULD BE ACCESSIBLE ===' as section,
  r.id,
  r.site_id,
  r.week_starting,
  r.status,
  r.company_id,
  p.company_id as user_company_id,
  CASE 
    WHEN r.company_id = p.company_id THEN '✅ Company matches'
    ELSE '❌ Company mismatch'
  END as company_match
FROM rotas r
CROSS JOIN (
  SELECT company_id 
  FROM profiles 
  WHERE id = auth.uid() OR auth_user_id = auth.uid()
  LIMIT 1
) p
WHERE r.company_id = p.company_id
LIMIT 10;

-- Step 3: Drop all existing rotas policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'rotas'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.rotas', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Step 4: Ensure RLS is enabled
ALTER TABLE public.rotas ENABLE ROW LEVEL SECURITY;

-- Step 5: Create SELECT policy - all company users can view rotas
CREATE POLICY rotas_select_by_company ON public.rotas
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
  );

-- Step 6: Create INSERT policy - managers/admins/owners can create rotas
CREATE POLICY rotas_insert_by_company ON public.rotas
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
        AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner', 'manager', 'general_manager', 'area_manager', 'ops_manager', 'super admin')
    )
  );

-- Step 7: Create UPDATE policy - managers/admins/owners can update rotas
CREATE POLICY rotas_update_by_company ON public.rotas
  FOR UPDATE
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
        AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner', 'manager', 'general_manager', 'area_manager', 'ops_manager', 'super admin')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
        AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner', 'manager', 'general_manager', 'area_manager', 'ops_manager', 'super admin')
    )
  );

-- Step 8: Create DELETE policy - admins/owners only
CREATE POLICY rotas_delete_by_company ON public.rotas
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
        AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner', 'super admin')
    )
  );

-- Step 9: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rotas TO authenticated;

-- Step 10: Verify the fix worked
SELECT 
  '=== VERIFICATION ===' as section,
  COUNT(*) as accessible_rotas_count
FROM rotas
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
WHERE tablename = 'rotas'
ORDER BY policyname;

