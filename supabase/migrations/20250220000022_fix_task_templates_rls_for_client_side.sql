-- ============================================================================
-- Migration: Fix task_templates RLS for Client-Side Operations
-- Description: Updates RLS policies to work with client-side operations
--              by checking user's profile company_id in addition to JWT claims
-- Note: This migration will be skipped if required tables don't exist yet
-- ============================================================================

DO $$
BEGIN
  -- Only proceed if task_templates table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN

    -- Drop existing policies
    DROP POLICY IF EXISTS tenant_modify_task_templates ON public.task_templates;

    -- Create updated policy that checks both JWT claims AND user's profile company_id
    -- Only if profiles table exists
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
    ELSE
      -- Fallback policy without profiles check
      CREATE POLICY tenant_modify_task_templates
        ON public.task_templates
        FOR ALL
        USING (
          public.is_service_role()
          OR matches_current_tenant(company_id)
        )
        WITH CHECK (
          public.is_service_role()
          OR matches_current_tenant(company_id)
        );
    END IF;

  ELSE
    RAISE NOTICE '⚠️ task_templates table does not exist yet - skipping RLS policy update';
  END IF;
END $$;

-- Note: This allows users to create/update task_templates if:
-- 1. They are using service role (server-side)
-- 2. Their JWT has the company_id claim set (matches_current_tenant)
-- 3. Their profile's company_id matches the template's company_id (client-side fallback)

