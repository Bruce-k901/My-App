-- ============================================================================
-- Migration: Fix task_completion_records RLS to properly allow service role
-- Description: Ensures service role can insert into task_completion_records
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS tenant_insert_task_completion_records ON public.task_completion_records;
DROP POLICY IF EXISTS tenant_modify_task_completion_records ON public.task_completion_records;

-- Create a more permissive INSERT policy that explicitly allows service role
-- Service role should bypass RLS entirely, but we'll make it explicit
CREATE POLICY tenant_insert_task_completion_records
  ON public.task_completion_records
  FOR INSERT
  WITH CHECK (
    -- Service role bypasses all checks
    public.is_service_role()
    OR
    -- Regular users: check company_id matches
    company_id = public.get_user_company_id()
    OR
    -- Fallback: tenant matching
    matches_current_tenant(company_id)
  );

-- UPDATE/DELETE policy (service role can do anything)
CREATE POLICY tenant_modify_task_completion_records
  ON public.task_completion_records
  FOR UPDATE
  USING (
    public.is_service_role()
    OR company_id = public.get_user_company_id()
    OR matches_current_tenant(company_id)
  )
  WITH CHECK (
    public.is_service_role()
    OR company_id = public.get_user_company_id()
    OR matches_current_tenant(company_id)
  );

-- Also add DELETE policy
CREATE POLICY tenant_delete_task_completion_records
  ON public.task_completion_records
  FOR DELETE
  USING (
    public.is_service_role()
    OR company_id = public.get_user_company_id()
    OR matches_current_tenant(company_id)
  );

-- Grant necessary permissions
GRANT INSERT, UPDATE, DELETE ON public.task_completion_records TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.task_completion_records TO authenticated;

