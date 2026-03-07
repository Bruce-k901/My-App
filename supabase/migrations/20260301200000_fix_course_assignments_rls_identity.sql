-- ============================================================================
-- Migration: Fix course_assignments RLS to handle both identity patterns
-- ============================================================================
-- The existing SELECT policy checks profiles.auth_user_id = auth.uid(),
-- but some profiles have auth_user_id = NULL and instead use
-- profiles.id = auth.uid() (old-style profiles). This fix adds the
-- id = auth.uid() check so both patterns work.
-- ============================================================================

-- Drop and recreate the SELECT policy
DROP POLICY IF EXISTS "Users can view their own assignments" ON public.course_assignments;
CREATE POLICY "Users can view their own assignments"
  ON public.course_assignments FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM profiles
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
    OR company_id IN (
      SELECT company_id FROM profiles
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
  );

-- Fix UPDATE policy too
DROP POLICY IF EXISTS "Users can update their own assignments" ON public.course_assignments;
CREATE POLICY "Users can update their own assignments"
  ON public.course_assignments FOR UPDATE
  USING (
    profile_id IN (
      SELECT id FROM profiles
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
    OR assigned_by IN (
      SELECT id FROM profiles
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
    )
  );

-- Fix INSERT policy
DROP POLICY IF EXISTS "Managers can create assignments" ON public.course_assignments;
CREATE POLICY "Managers can create assignments"
  ON public.course_assignments FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
        AND LOWER(app_role::text) IN ('admin', 'owner', 'manager', 'general_manager', 'area_manager', 'regional_manager')
    )
  );

-- Fix manager UPDATE policy
DROP POLICY IF EXISTS "Managers can update company assignments" ON public.course_assignments;
CREATE POLICY "Managers can update company assignments"
  ON public.course_assignments FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE (id = auth.uid() OR auth_user_id = auth.uid())
        AND LOWER(app_role::text) IN ('admin', 'owner', 'manager', 'general_manager', 'area_manager', 'regional_manager')
    )
  );
