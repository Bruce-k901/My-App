-- Fix Rotas INSERT RLS Policy
-- This script fixes the RLS issue preventing rota creation
-- The issue is that the existing policies use get_user_company_id() which may not work correctly
-- This fix uses direct profile table queries instead

-- Step 1: Drop all existing rotas policies
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

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.rotas ENABLE ROW LEVEL SECURITY;

-- Step 3: Create SELECT policy - all company users can view rotas
CREATE POLICY rotas_select_by_company ON public.rotas
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
  );

-- Step 4: Create INSERT policy - managers/admins/owners can create rotas
-- This is the critical fix - it checks company_id match AND user role
CREATE POLICY rotas_insert_by_company ON public.rotas
  FOR INSERT
  WITH CHECK (
    -- User must belong to the same company as the rota being inserted
    -- In WITH CHECK, 'company_id' refers to the NEW row's company_id
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

-- Step 5: Create UPDATE policy - managers/admins/owners can update rotas
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
        AND company_id = rotas.company_id
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
        AND company_id = rotas.company_id
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

-- Step 6: Create DELETE policy - admins/owners only
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
        AND company_id = rotas.company_id
        AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner', 'super admin')
    )
  );

-- Step 7: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rotas TO authenticated;

-- Step 8: Verify the fix
SELECT 
  '=== VERIFICATION ===' as section,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'rotas'
ORDER BY policyname;

