-- ============================================================================
-- Migration: Fix checklist_tasks RLS for Client-Side Operations
-- Description: Updates RLS policies to work with client-side operations
--              by checking user's profile company_id in addition to JWT claims
-- ============================================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if checklist_tasks table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checklist_tasks') THEN

    -- Drop existing policies
    DROP POLICY IF EXISTS tenant_select_checklist_tasks ON public.checklist_tasks;
    DROP POLICY IF EXISTS tenant_modify_checklist_tasks ON public.checklist_tasks;

    -- Only create policies if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

      -- Create updated SELECT policy that checks both JWT claims AND user's profile company_id
      CREATE POLICY tenant_select_checklist_tasks
        ON public.checklist_tasks
        FOR SELECT
        USING (
          (SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'is_service_role')) AND public.is_service_role()
          OR (SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'matches_current_tenant')) AND matches_current_tenant(company_id)
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
          (SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'is_service_role')) AND public.is_service_role()
          OR (SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'matches_current_tenant')) AND matches_current_tenant(company_id)
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
              AND p.company_id = checklist_tasks.company_id
          )
        )
        WITH CHECK (
          (SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'is_service_role')) AND public.is_service_role()
          OR (SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'matches_current_tenant')) AND matches_current_tenant(company_id)
          OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
              AND p.company_id = checklist_tasks.company_id
          )
        );

    END IF;

    RAISE NOTICE 'Updated checklist_tasks RLS policies for client-side operations';

  ELSE
    RAISE NOTICE '⚠️ checklist_tasks table does not exist yet - skipping RLS policy updates';
  END IF;
END $$;

-- Note: This allows users to access checklist_tasks if:
-- 1. They are using service role (server-side)
-- 2. Their JWT has the company_id claim set (matches_current_tenant)
-- 3. Their profile's company_id matches the task's company_id (client-side fallback)

