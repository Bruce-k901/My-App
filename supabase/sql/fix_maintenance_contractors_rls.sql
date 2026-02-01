-- Fix RLS policies for maintenance_contractors table
-- Change 'role' to 'app_role' to match the profiles table schema

-- Drop existing policies
DROP POLICY IF EXISTS maintenance_contractors_select_company ON public.maintenance_contractors;
DROP POLICY IF EXISTS maintenance_contractors_insert_company ON public.maintenance_contractors;
DROP POLICY IF EXISTS maintenance_contractors_update_company ON public.maintenance_contractors;
DROP POLICY IF EXISTS maintenance_contractors_delete_company ON public.maintenance_contractors;

-- Recreate with correct column name (app_role instead of role)
CREATE POLICY maintenance_contractors_select_company
  ON public.maintenance_contractors
  FOR SELECT
  USING (
    -- Any company member can read contractors; also allow company owners
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = maintenance_contractors.company_id
    )
    OR EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id = maintenance_contractors.company_id
        AND (c.user_id = auth.uid() OR c.created_by = auth.uid())
    )
  );

CREATE POLICY maintenance_contractors_insert_company
  ON public.maintenance_contractors
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = maintenance_contractors.company_id
        AND LOWER(p.app_role::text) IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY maintenance_contractors_update_company
  ON public.maintenance_contractors
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = maintenance_contractors.company_id
        AND LOWER(p.app_role::text) IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = maintenance_contractors.company_id
        AND LOWER(p.app_role::text) IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY maintenance_contractors_delete_company
  ON public.maintenance_contractors
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = maintenance_contractors.company_id
        AND LOWER(p.app_role::text) IN ('owner', 'admin', 'manager')
    )
  );

-- Ensure the table is exposed in PostgREST API
-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_contractors TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

