-- ============================================================================
-- Migration: Fix task_templates SELECT RLS for Client-Side Operations
-- Description: Updates SELECT RLS policy to work with client-side operations
--              by checking user's profile company_id in addition to JWT claims
-- ============================================================================

BEGIN;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS tenant_select_task_templates ON public.task_templates;

-- Create updated SELECT policy that checks both JWT claims AND user's profile company_id
CREATE POLICY tenant_select_task_templates
  ON public.task_templates
  FOR SELECT
  USING (
    public.is_service_role()
    OR matches_current_tenant(company_id)
    OR company_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = task_templates.company_id
    )
  );

COMMIT;

-- Note: This allows users to view task_templates if:
-- 1. They are using service role (server-side)
-- 2. Their JWT has the company_id claim set (matches_current_tenant)
-- 3. The template has no company_id (global templates)
-- 4. Their profile's company_id matches the template's company_id (client-side fallback)

