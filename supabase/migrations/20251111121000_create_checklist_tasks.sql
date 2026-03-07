-- ============================================================================
-- Migration: 20251111121000_create_checklist_tasks.sql
-- Description: Creates checklist_tasks table used by dashboard and task flows
-- ============================================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    CREATE TABLE IF NOT EXISTS public.checklist_tasks (
      id uuid primary key default gen_random_uuid(),
      template_id uuid references public.task_templates(id) on delete set null,
      company_id uuid not null references public.companies(id) on delete cascade,
      site_id uuid references public.sites(id) on delete set null,
      custom_name text,
      custom_instructions text,
      due_date date not null,
      due_time text,
      daypart text,
      priority text default 'medium',
      status text default 'pending',
      flagged boolean default false,
      flag_reason text,
      escalated boolean default false,
      escalated_to text,
      escalation_reason text,
      assigned_to_role text,
      assigned_to_user_id uuid references public.profiles(id) on delete set null,
      task_data jsonb,
      generated_at timestamptz default now(),
      expires_at timestamptz,
      completed_at timestamptz,
      completed_by uuid references public.profiles(id) on delete set null,
      completion_notes text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    CREATE INDEX IF NOT EXISTS checklist_tasks_company_status_idx
      ON public.checklist_tasks (company_id, status);

    CREATE INDEX IF NOT EXISTS checklist_tasks_site_idx
      ON public.checklist_tasks (site_id, due_date);

    ALTER TABLE public.checklist_tasks ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS tenant_select_checklist_tasks ON public.checklist_tasks;
    CREATE POLICY tenant_select_checklist_tasks
      ON public.checklist_tasks
      FOR SELECT
      USING (
        public.is_service_role()
        OR matches_current_tenant(company_id)
      );

    DROP POLICY IF EXISTS tenant_modify_checklist_tasks ON public.checklist_tasks;
    CREATE POLICY tenant_modify_checklist_tasks
      ON public.checklist_tasks
      FOR ALL
      USING (
        public.is_service_role()
        OR matches_current_tenant(company_id)
      )
      WITH CHECK (
        public.is_service_role()
        OR matches_current_tenant(company_id)
      );

    RAISE NOTICE 'Created checklist_tasks table with RLS policies';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, sites, profiles) do not exist yet - skipping checklist_tasks';
  END IF;
END $$;
