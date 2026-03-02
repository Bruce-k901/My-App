-- ============================================================================
-- Migration: 20251111134000_create_task_completion_records.sql
-- Description: Creates task completion ledger mirror used by Completed Tasks page
-- ============================================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checklist_tasks') THEN

    CREATE TABLE IF NOT EXISTS public.task_completion_records (
      id uuid primary key default gen_random_uuid(),
      task_id uuid not null references public.checklist_tasks(id) on delete cascade,
      template_id uuid references public.task_templates(id) on delete set null,
      company_id uuid not null references public.companies(id) on delete cascade,
      site_id uuid references public.sites(id) on delete set null,
      completed_by uuid references public.profiles(id) on delete set null,
      completed_at timestamptz not null default now(),
      duration_seconds integer,
      completion_data jsonb,
      evidence_attachments jsonb,
      flagged boolean default false,
      flag_reason text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    CREATE INDEX IF NOT EXISTS task_completion_records_company_idx
      ON public.task_completion_records (company_id, completed_at desc);

    CREATE INDEX IF NOT EXISTS task_completion_records_site_idx
      ON public.task_completion_records (site_id, completed_at desc);

    ALTER TABLE public.task_completion_records ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS tenant_select_task_completion_records ON public.task_completion_records;
    CREATE POLICY tenant_select_task_completion_records
      ON public.task_completion_records
      FOR SELECT
      USING (
        public.is_service_role()
        OR (
          matches_current_tenant(company_id)
          AND (
            site_id IS NULL
            OR public.has_site_access(site_id)
          )
        )
      );

    DROP POLICY IF EXISTS tenant_modify_task_completion_records ON public.task_completion_records;
    CREATE POLICY tenant_modify_task_completion_records
      ON public.task_completion_records
      FOR ALL
      USING (
        public.is_service_role()
        OR (
          matches_current_tenant(company_id)
          AND (
            site_id IS NULL
            OR public.has_site_access(site_id)
          )
        )
      )
      WITH CHECK (
        public.is_service_role()
        OR (
          -- Primary check: user has site access (which already validates tenant)
          (
            site_id IS NOT NULL
            AND public.has_site_access(site_id)
          )
          -- Fallback: company_id matches user's profile company (for records without site_id)
          OR (
            site_id IS NULL
            AND company_id IN (
              SELECT company_id FROM public.profiles 
              WHERE id = auth.uid() OR auth_user_id = auth.uid()
            )
          )
          -- Fallback: tenant matches (if JWT has tenant_id claim)
          OR (
            matches_current_tenant(company_id)
            AND (
              site_id IS NULL
              OR public.has_site_access(site_id)
            )
          )
        )
      );

    RAISE NOTICE 'Created task_completion_records table with RLS policies';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, sites, profiles, checklist_tasks) do not exist yet - skipping task_completion_records';
  END IF;
END $$;
