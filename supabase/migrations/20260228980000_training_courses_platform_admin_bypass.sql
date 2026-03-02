-- ============================================================================
-- Migration: training_courses platform admin bypass
-- Description: Add matches_current_tenant() bypass to training_courses RLS
--              so platform admins can view/manage courses for any company.
-- ============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "view_company_courses" ON public.training_courses;
DROP POLICY IF EXISTS "manage_courses" ON public.training_courses;

-- SELECT: any user in the same company OR platform admin
CREATE POLICY "view_company_courses"
ON public.training_courses FOR SELECT
USING (
  matches_current_tenant(company_id)
  OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
);

-- INSERT/UPDATE/DELETE: admin/owner/manager in the same company OR platform admin
CREATE POLICY "manage_courses"
ON public.training_courses FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_platform_admin = true
  )
  OR company_id IN (
    SELECT company_id FROM profiles
    WHERE id = auth.uid()
    AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_platform_admin = true
  )
  OR company_id IN (
    SELECT company_id FROM profiles
    WHERE id = auth.uid()
    AND LOWER(COALESCE(app_role::TEXT, '')) IN ('admin', 'owner', 'manager')
  )
);

NOTIFY pgrst, 'reload schema';
