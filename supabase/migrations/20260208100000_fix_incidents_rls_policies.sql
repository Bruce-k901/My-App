-- ============================================================================
-- Migration: 20260208100000_fix_incidents_rls_policies.sql
-- Description: Fix incidents status CHECK constraint and RLS policies.
--
-- Problem 1 (CHECK constraint - causes 400 error):
--   The incidents table has a status CHECK constraint that may not include all
--   the status values the application uses. The app expects:
--   'open', 'investigating', 'resolved', 'closed'
--   This migration drops and recreates the constraint with the correct values.
--
-- Problem 2 (RLS policies):
--   The tenant_modify_incidents policy joins to sites via site_id, which fails
--   for incidents with NULL site_id or when current_tenant() returns NULL.
-- ============================================================================

-- STEP 1: Fix the status CHECK constraint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'incidents') THEN

    -- Drop ALL existing CHECK constraints on the status column
    -- PostgreSQL auto-names inline constraints as <table>_<column>_check
    ALTER TABLE public.incidents DROP CONSTRAINT IF EXISTS incidents_status_check;
    ALTER TABLE public.incidents DROP CONSTRAINT IF EXISTS incidents_status_check1;

    -- Recreate with the correct allowed values that match the application code
    ALTER TABLE public.incidents
      ADD CONSTRAINT incidents_status_check
      CHECK (status IN ('open', 'investigating', 'resolved', 'closed'));

    RAISE NOTICE 'Fixed incidents status CHECK constraint';
  END IF;
END $$;

-- STEP 2: Fix RLS policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'incidents') THEN

    -- Drop the broken tenant-based policies that rely on site_id join + current_tenant()
    DROP POLICY IF EXISTS tenant_select_incidents ON public.incidents;
    DROP POLICY IF EXISTS tenant_modify_incidents ON public.incidents;

    -- Recreate tenant policies that check BOTH company_id directly AND via sites join
    CREATE POLICY tenant_select_incidents
      ON public.incidents
      FOR SELECT
      USING (
        public.is_service_role()
        OR company_id IN (SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.sites s
          WHERE s.id = incidents.site_id
            AND matches_current_tenant(s.company_id)
        )
      );

    CREATE POLICY tenant_modify_incidents
      ON public.incidents
      FOR ALL
      USING (
        public.is_service_role()
        OR company_id IN (SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.sites s
          WHERE s.id = incidents.site_id
            AND matches_current_tenant(s.company_id)
        )
      )
      WITH CHECK (
        public.is_service_role()
        OR company_id IN (SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.sites s
          WHERE s.id = incidents.site_id
            AND matches_current_tenant(s.company_id)
        )
      );

    -- Ensure the original company-based policies also exist
    DROP POLICY IF EXISTS "Users can view incidents for their company" ON public.incidents;
    CREATE POLICY "Users can view incidents for their company"
      ON public.incidents FOR SELECT
      USING (
        company_id IN (
          SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "Users can insert incidents for their company" ON public.incidents;
    CREATE POLICY "Users can insert incidents for their company"
      ON public.incidents FOR INSERT
      WITH CHECK (
        company_id IN (
          SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "Users can update incidents for their company" ON public.incidents;
    CREATE POLICY "Users can update incidents for their company"
      ON public.incidents FOR UPDATE
      USING (
        company_id IN (
          SELECT p.company_id FROM public.profiles p WHERE p.id = auth.uid()
        )
      );

    RAISE NOTICE 'Fixed incidents RLS policies';
  ELSE
    RAISE NOTICE 'incidents table does not exist - skipping';
  END IF;
END $$;
