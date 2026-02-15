-- ============================================================================
-- Migration: Fix task_templates MODIFY RLS for Client-Side Operations
-- Description: Updates the modify (INSERT/UPDATE/DELETE) RLS policy to work
--              with client-side operations by checking user's profile company_id
--              in addition to JWT claims (matches the SELECT policy fix)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN

    DROP POLICY IF EXISTS tenant_modify_task_templates ON public.task_templates;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

      CREATE POLICY tenant_modify_task_templates
        ON public.task_templates
        FOR ALL
        USING (
          public.is_service_role()
          OR matches_current_tenant(company_id)
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
              AND p.company_id = task_templates.company_id
          )
        )
        WITH CHECK (
          public.is_service_role()
          OR matches_current_tenant(company_id)
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
              AND p.company_id = task_templates.company_id
          )
        );

      RAISE NOTICE 'Updated task_templates MODIFY RLS policy for client-side operations';

    END IF;

  ELSE
    RAISE NOTICE 'task_templates table does not exist yet - skipping';
  END IF;
END $$;
