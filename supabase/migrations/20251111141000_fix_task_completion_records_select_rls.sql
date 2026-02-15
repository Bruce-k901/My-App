-- ============================================================================
-- Migration: 20251111141000_fix_task_completion_records_select_rls.sql
-- Description: Fix SELECT RLS policy for task_completion_records to allow reads
-- ============================================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_completion_records') THEN

    -- Ensure the helper function exists (it should be created in 20251111135000, but create it here if missing)
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

    -- Update the SELECT policy to use the same logic as INSERT (more permissive)
    DROP POLICY IF EXISTS tenant_select_task_completion_records ON public.task_completion_records;

    CREATE POLICY tenant_select_task_completion_records
      ON public.task_completion_records
      FOR SELECT
      USING (
        public.is_service_role()
        OR matches_current_tenant(company_id)
        OR company_id = public.get_user_company_id()
      );

    RAISE NOTICE 'Fixed task_completion_records SELECT RLS policy';

  ELSE
    RAISE NOTICE '⚠️ Required tables (profiles, task_completion_records) do not exist yet - skipping SELECT RLS fix';
  END IF;
END $$;

