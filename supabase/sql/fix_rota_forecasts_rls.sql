-- Fix Rota Forecasts RLS Policy
-- This script fixes the RLS issue preventing rota forecasts from being viewed/created
-- The issue is that the existing policies use get_user_company_id() or nested subqueries which may not work correctly
-- This fix uses direct profile table queries instead

-- Step 1: Drop all existing rota_forecasts policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'rota_forecasts'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.rota_forecasts', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.rota_forecasts ENABLE ROW LEVEL SECURITY;

-- Step 3: Create SELECT policy - all company users can view forecasts
-- Forecasts are linked to rotas via rota_id, so we check through the rotas table
CREATE POLICY rota_forecasts_select_by_company ON public.rota_forecasts
  FOR SELECT
  USING (
    rota_id IN (
      SELECT id 
      FROM rotas 
      WHERE company_id IN (
        SELECT company_id 
        FROM profiles 
        WHERE id = auth.uid() OR auth_user_id = auth.uid()
      )
    )
  );

-- Step 4: Create INSERT policy - managers/admins/owners can create forecasts
CREATE POLICY rota_forecasts_insert_by_company ON public.rota_forecasts
  FOR INSERT
  WITH CHECK (
    -- Forecast must be for a rota in the user's company
    rota_id IN (
      SELECT id 
      FROM rotas 
      WHERE company_id IN (
        SELECT company_id 
        FROM profiles 
        WHERE id = auth.uid() OR auth_user_id = auth.uid()
      )
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

-- Step 5: Create UPDATE policy - managers/admins/owners can update forecasts
CREATE POLICY rota_forecasts_update_by_company ON public.rota_forecasts
  FOR UPDATE
  USING (
    rota_id IN (
      SELECT id 
      FROM rotas 
      WHERE company_id IN (
        SELECT company_id 
        FROM profiles 
        WHERE id = auth.uid() OR auth_user_id = auth.uid()
      )
    )
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
  )
  WITH CHECK (
    rota_id IN (
      SELECT id 
      FROM rotas 
      WHERE company_id IN (
        SELECT company_id 
        FROM profiles 
        WHERE id = auth.uid() OR auth_user_id = auth.uid()
      )
    )
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

-- Step 6: Create DELETE policy - managers/admins/owners can delete forecasts
CREATE POLICY rota_forecasts_delete_by_company ON public.rota_forecasts
  FOR DELETE
  USING (
    rota_id IN (
      SELECT id 
      FROM rotas 
      WHERE company_id IN (
        SELECT company_id 
        FROM profiles 
        WHERE id = auth.uid() OR auth_user_id = auth.uid()
      )
    )
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

-- Step 7: Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rota_forecasts TO authenticated;

-- Step 8: Verify the fix
SELECT 
  '=== VERIFICATION ===' as section,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'rota_forecasts'
ORDER BY policyname;

