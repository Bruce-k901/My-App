-- ============================================================================
-- Migration: 20251111101500_create_temperature_breach_actions.sql
-- Description: Creates temperature breach actions table for monitor/callout workflow
-- ============================================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'temperature_logs')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    CREATE TABLE IF NOT EXISTS public.temperature_breach_actions (
      id uuid primary key default gen_random_uuid(),
      company_id uuid not null references public.companies(id) on delete cascade,
      site_id uuid not null references public.sites(id) on delete cascade,
      temperature_log_id uuid not null references public.temperature_logs(id) on delete cascade,
      action_type text not null check (action_type in ('monitor', 'callout')),
      status text not null default 'pending' check (status in ('pending', 'acknowledged', 'completed', 'cancelled')),
      due_at timestamptz,
      completed_at timestamptz,
      assigned_to uuid references public.profiles(id) on delete set null,
      notes text,
      metadata jsonb default '{}'::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (temperature_log_id, action_type)
    );

    CREATE INDEX IF NOT EXISTS idx_temperature_breach_actions_company_status
      ON public.temperature_breach_actions (company_id, status, created_at desc);

    CREATE INDEX IF NOT EXISTS idx_temperature_breach_actions_site
      ON public.temperature_breach_actions (site_id, created_at desc);

    CREATE INDEX IF NOT EXISTS idx_temperature_breach_actions_due
      ON public.temperature_breach_actions (status, due_at);

    ALTER TABLE public.temperature_breach_actions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS tenant_select_temperature_breach_actions ON public.temperature_breach_actions;
    CREATE POLICY tenant_select_temperature_breach_actions
      ON public.temperature_breach_actions
      FOR SELECT
      USING (
        company_id = public.current_tenant()
        OR public.is_service_role()
      );

    DROP POLICY IF EXISTS tenant_modify_temperature_breach_actions ON public.temperature_breach_actions;
    CREATE POLICY tenant_modify_temperature_breach_actions
      ON public.temperature_breach_actions
      FOR ALL
      USING (
        company_id = public.current_tenant()
        OR public.is_service_role()
      )
      WITH CHECK (
        company_id = public.current_tenant()
        OR public.is_service_role()
      );

    RAISE NOTICE 'Created temperature_breach_actions table with RLS policies';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, sites, temperature_logs, profiles) do not exist yet - skipping temperature breach actions';
  END IF;
END $$;


