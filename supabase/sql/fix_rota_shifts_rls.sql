-- Fix Rota Shifts RLS Policy
-- This script fixes the RLS issue preventing rota shifts from being viewed/created
-- The issue is that the existing policies use get_user_company_id() which may not work correctly
-- This fix uses direct profile table queries instead

-- Step 1: Drop all existing rota_shifts policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'rota_shifts'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.rota_shifts', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.rota_shifts ENABLE ROW LEVEL SECURITY;

-- Step 3: Create SELECT policy - all company users can view shifts
CREATE POLICY rota_shifts_select_by_company ON public.rota_shifts
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
  );

-- Step 4: Create INSERT policy - managers/admins/owners can create shifts
CREATE POLICY rota_shifts_insert_by_company ON public.rota_shifts
  FOR INSERT
  WITH CHECK (
    -- User must belong to the same company as the shift being inserted
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
    -- User must have appropriate role (managers, admins, owners)
    AND EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
        AND LOWER(COALESCE(app_role::text, '')) IN (
          'admin', 
          'owner', 
          'manager', 
          'general_manager', 
          'area_manager', 
          'ops_manager', 
          'super admin'
        )
    )
  );

-- Step 5: Create UPDATE policy - managers/admins/owners can update shifts
CREATE POLICY rota_shifts_update_by_company ON public.rota_shifts
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
        AND company_id = rota_shifts.company_id
        AND LOWER(COALESCE(app_role::text, '')) IN (
          'admin', 
          'owner', 
          'manager', 
          'general_manager', 
          'area_manager', 
          'ops_manager', 
          'super admin'
        )
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
        AND company_id = rota_shifts.company_id
        AND LOWER(COALESCE(app_role::text, '')) IN (
          'admin', 
          'owner', 
          'manager', 
          'general_manager', 
          'area_manager', 
          'ops_manager', 
          'super admin'
        )
    )
  );

-- Step 6: Create DELETE policy - managers/admins/owners can delete shifts
CREATE POLICY rota_shifts_delete_by_company ON public.rota_shifts
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
        AND company_id = rota_shifts.company_id
        AND LOWER(COALESCE(app_role::text, '')) IN (
          'admin', 
          'owner', 
          'manager', 
          'general_manager', 
          'area_manager', 
          'ops_manager', 
          'super admin'
        )
    )
  );

-- Step 7: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rota_shifts TO authenticated;

-- Step 8: Verify the fix
SELECT 
  '=== VERIFICATION ===' as section,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'rota_shifts'
ORDER BY policyname;

