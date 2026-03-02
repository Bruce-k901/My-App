-- Migration: Fix RLS policies for planly_equipment_types
-- The existing policies for company-wide records (site_id IS NULL) only check
-- user_site_access table, but don't account for users who have access via their
-- profile role (owner, admin, area_manager, general_manager).
-- This migration fixes that by creating a consistent access check function.

-- Create a helper function to check if user has access to a company
CREATE OR REPLACE FUNCTION has_planly_company_access(target_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT
    -- Check user_site_access table
    EXISTS (
      SELECT 1
      FROM user_site_access usa
      JOIN sites s ON s.id = usa.site_id
      WHERE usa.auth_user_id = auth.uid()
        AND s.company_id = target_company_id
    )
    OR
    -- Check profile-based access (same as has_planly_site_access uses)
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = target_company_id
    );
$$;

-- Recreate the RLS policies with the fixed logic

-- SELECT policy
DROP POLICY IF EXISTS "equipment_types_select" ON planly_equipment_types;
CREATE POLICY "equipment_types_select" ON planly_equipment_types FOR SELECT
  USING (
    (site_id IS NOT NULL AND has_planly_site_access(site_id))
    OR
    (site_id IS NULL AND has_planly_company_access(company_id))
  );

-- INSERT policy
DROP POLICY IF EXISTS "equipment_types_insert" ON planly_equipment_types;
CREATE POLICY "equipment_types_insert" ON planly_equipment_types FOR INSERT
  WITH CHECK (
    (site_id IS NOT NULL AND has_planly_site_access(site_id))
    OR
    (site_id IS NULL AND has_planly_company_access(company_id))
  );

-- UPDATE policy
DROP POLICY IF EXISTS "equipment_types_update" ON planly_equipment_types;
CREATE POLICY "equipment_types_update" ON planly_equipment_types FOR UPDATE
  USING (
    (site_id IS NOT NULL AND has_planly_site_access(site_id))
    OR
    (site_id IS NULL AND has_planly_company_access(company_id))
  );

-- DELETE policy
DROP POLICY IF EXISTS "equipment_types_delete" ON planly_equipment_types;
CREATE POLICY "equipment_types_delete" ON planly_equipment_types FOR DELETE
  USING (
    (site_id IS NOT NULL AND has_planly_site_access(site_id))
    OR
    (site_id IS NULL AND has_planly_company_access(company_id))
  );
