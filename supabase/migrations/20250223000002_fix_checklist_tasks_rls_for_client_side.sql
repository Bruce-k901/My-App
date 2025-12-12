-- ============================================================================
-- Migration: Fix checklist_tasks RLS for Client-Side Operations
-- Description: Updates RLS policies to work with client-side operations
--              by checking user's profile company_id in addition to JWT claims
-- ============================================================================

BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS tenant_select_checklist_tasks ON public.checklist_tasks;
DROP POLICY IF EXISTS tenant_modify_checklist_tasks ON public.checklist_tasks;

-- Create updated SELECT policy that checks both JWT claims AND user's profile company_id
CREATE POLICY tenant_select_checklist_tasks
  ON public.checklist_tasks
  FOR SELECT
  USING (
    public.is_service_role()
    OR matches_current_tenant(company_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = checklist_tasks.company_id
    )
  );

-- Create updated MODIFY policy (INSERT, UPDATE, DELETE) that checks both JWT claims AND user's profile company_id
CREATE POLICY tenant_modify_checklist_tasks
  ON public.checklist_tasks
  FOR ALL
  USING (
    public.is_service_role()
    OR matches_current_tenant(company_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = checklist_tasks.company_id
    )
  )
  WITH CHECK (
    public.is_service_role()
    OR matches_current_tenant(company_id)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = checklist_tasks.company_id
    )
  );

COMMIT;

-- Note: This allows users to access checklist_tasks if:
-- 1. They are using service role (server-side)
-- 2. Their JWT has the company_id claim set (matches_current_tenant)
-- 3. Their profile's company_id matches the task's company_id (client-side fallback)

