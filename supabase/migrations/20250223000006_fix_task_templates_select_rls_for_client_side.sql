-- ============================================================================
-- Migration: Fix task_templates SELECT RLS for Client-Side Operations
-- Description: Updates SELECT RLS policy to work with client-side operations
--              by checking user's profile company_id in addition to JWT claims
-- ============================================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if task_templates table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN

    -- Drop existing SELECT policy
    DROP POLICY IF EXISTS tenant_select_task_templates ON public.task_templates;

    -- Only create policy if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

      -- Create updated SELECT policy that checks both JWT claims AND user's profile company_id
      CREATE POLICY tenant_select_task_templates
        ON public.task_templates
        FOR SELECT
        USING (
          (SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'is_service_role')) AND public.is_service_role()
          OR (SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'matches_current_tenant')) AND matches_current_tenant(company_id)
          OR company_id IS NULL
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
              AND p.company_id = task_templates.company_id
          )
        );

    END IF;

    RAISE NOTICE 'Updated task_templates SELECT RLS policy for client-side operations';

  ELSE
    RAISE NOTICE '⚠️ task_templates table does not exist yet - skipping RLS policy update';
  END IF;
END $$;

-- Note: This allows users to view task_templates if:
-- 1. They are using service role (server-side)
-- 2. Their JWT has the company_id claim set (matches_current_tenant)
-- 3. The template has no company_id (global templates)
-- 4. Their profile's company_id matches the template's company_id (client-side fallback)

