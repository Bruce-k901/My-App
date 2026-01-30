-- ============================================================================
-- Migration: 20251112071947_fix_global_documents_audit_rls.sql
-- Description: Fix RLS policies for global_documents_audit table
-- ============================================================================
-- Note: This migration will be skipped if required table doesn't exist yet

DO $$
BEGIN
  -- Only proceed if required table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'global_documents_audit') THEN

    -- Ensure RLS is enabled for the audit table
    ALTER TABLE public.global_documents_audit ENABLE ROW LEVEL SECURITY;

    -- Allow authenticated users to see their audit history (optional, mostly for debugging)
    DROP POLICY IF EXISTS global_documents_audit_select ON public.global_documents_audit;
    CREATE POLICY global_documents_audit_select
      ON public.global_documents_audit
      FOR SELECT
      USING (auth.uid() IS NOT NULL OR public.is_service_role());

    -- Allow audit trigger to insert rows
    -- The trigger runs as the same role as the caller (authenticated), so we need an insert policy
    -- The trigger will populate document_id/action/timestamp/user_id, so we accept any values here
    DROP POLICY IF EXISTS global_documents_audit_insert ON public.global_documents_audit;
    CREATE POLICY global_documents_audit_insert
      ON public.global_documents_audit
      FOR INSERT
      WITH CHECK (auth.uid() IS NOT NULL OR public.is_service_role());

    RAISE NOTICE 'Fixed global_documents_audit RLS policies';

  ELSE
    RAISE NOTICE '⚠️ Required table (global_documents_audit) does not exist yet - skipping RLS fix';
  END IF;
END $$;




