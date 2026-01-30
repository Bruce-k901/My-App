-- Fix Sites RLS Access Issue
-- This ensures users can access sites from their company

-- First, check current policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'sites';

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS tenant_select_sites ON public.sites;
DROP POLICY IF EXISTS tenant_modify_sites ON public.sites;
DROP POLICY IF EXISTS sites_select_company ON public.sites;
DROP POLICY IF EXISTS sites_insert_company ON public.sites;
DROP POLICY IF EXISTS sites_update_company ON public.sites;
DROP POLICY IF EXISTS sites_delete_company ON public.sites;

-- Create comprehensive SELECT policy
-- Users can see sites from their company (checking both id and auth_user_id)
CREATE POLICY sites_select_company ON public.sites
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
  );

-- Create INSERT policy
CREATE POLICY sites_insert_company ON public.sites
  FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id 
      FROM profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
  );

-- Create UPDATE policy
CREATE POLICY sites_update_company ON public.sites
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

-- Create DELETE policy (admins/owners only)
CREATE POLICY sites_delete_company ON public.sites
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
        AND app_role IN ('Admin', 'Owner', 'Owner')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sites TO authenticated;

-- Verify policies were created
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as has_using,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as has_with_check
FROM pg_policies
WHERE tablename = 'sites';

