-- ============================================================================
-- Migration: 20251111135000_fix_task_completion_records_rls.sql
-- Description: Fix RLS policy for task_completion_records to allow inserts
-- ============================================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_completion_records') THEN

    -- Create a SECURITY DEFINER function to get user's company_id (bypasses RLS)
    CREATE OR REPLACE FUNCTION public.get_user_company_id()
    RETURNS uuid
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $func$
      SELECT company_id 
      FROM public.profiles 
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
      LIMIT 1;
    $func$;

    -- Update the modify policy - use the function to bypass profiles RLS
    -- Also add explicit INSERT policy for better debugging
    DROP POLICY IF EXISTS tenant_modify_task_completion_records ON public.task_completion_records;
    DROP POLICY IF EXISTS tenant_insert_task_completion_records ON public.task_completion_records;

    -- Separate INSERT policy (most permissive for debugging)
    CREATE POLICY tenant_insert_task_completion_records
      ON public.task_completion_records
      FOR INSERT
      WITH CHECK (
        public.is_service_role()
        OR matches_current_tenant(company_id)
        OR company_id = public.get_user_company_id()
      );

    -- UPDATE/DELETE policy
    CREATE POLICY tenant_modify_task_completion_records
      ON public.task_completion_records
      FOR ALL
      USING (
        public.is_service_role()
        OR matches_current_tenant(company_id)
        OR company_id = public.get_user_company_id()
      );

    RAISE NOTICE 'Fixed task_completion_records RLS policies';

  ELSE
    RAISE NOTICE '⚠️ Required tables (profiles, task_completion_records) do not exist yet - skipping RLS fix';
  END IF;
END $$;

