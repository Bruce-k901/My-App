-- ============================================================================
-- Migration: departments platform admin bypass
-- Description: Add matches_current_tenant() and platform admin bypass to
--              departments RLS so platform admins can manage departments
--              for any company.
-- ============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "departments_select_company" ON public.departments;
DROP POLICY IF EXISTS "departments_insert_company" ON public.departments;
DROP POLICY IF EXISTS "departments_update_company" ON public.departments;
DROP POLICY IF EXISTS "departments_delete_company" ON public.departments;

-- SELECT: same company OR platform admin
CREATE POLICY "departments_select_company"
ON public.departments FOR SELECT
USING (
  matches_current_tenant(company_id)
  OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- INSERT: same company OR platform admin
CREATE POLICY "departments_insert_company"
ON public.departments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_platform_admin = true
  )
  OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- UPDATE: same company OR platform admin
CREATE POLICY "departments_update_company"
ON public.departments FOR UPDATE
USING (
  matches_current_tenant(company_id)
  OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_platform_admin = true
  )
  OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- DELETE: same company OR platform admin
CREATE POLICY "departments_delete_company"
ON public.departments FOR DELETE
USING (
  matches_current_tenant(company_id)
  OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

NOTIFY pgrst, 'reload schema';
