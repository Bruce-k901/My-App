-- ============================================================================
-- Migration: 20251111132000_create_temperature_logs.sql
-- Description: Ensures temperature_logs table exists for breach tracking
-- ============================================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    -- Create table without asset_id foreign key first (assets table might not exist)
    CREATE TABLE IF NOT EXISTS public.temperature_logs (
      id uuid primary key default gen_random_uuid(),
      company_id uuid not null references public.companies(id) on delete cascade,
      site_id uuid references public.sites(id) on delete set null,
      asset_id uuid,
      reading numeric not null,
      unit text default 'celsius',
      recorded_at timestamptz not null default now(),
      recorded_by uuid references public.profiles(id) on delete set null,
      status text default 'ok',
      source text,
      meta jsonb,
      created_at timestamptz not null default now()
    );

    -- Add asset_id foreign key constraint only if assets table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assets') THEN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'temperature_logs' 
        AND constraint_name LIKE '%asset_id%'
      ) THEN
        ALTER TABLE public.temperature_logs 
        ADD CONSTRAINT temperature_logs_asset_id_fkey 
        FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE SET NULL;
      END IF;
    END IF;

    CREATE INDEX IF NOT EXISTS temperature_logs_company_idx
      ON public.temperature_logs (company_id, recorded_at desc);

    CREATE INDEX IF NOT EXISTS temperature_logs_site_idx
      ON public.temperature_logs (site_id, recorded_at desc);

    ALTER TABLE public.temperature_logs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS tenant_select_temperature_logs ON public.temperature_logs;
    CREATE POLICY tenant_select_temperature_logs
      ON public.temperature_logs
      FOR SELECT
      USING (
        public.is_service_role()
        OR matches_current_tenant(company_id)
      );

    DROP POLICY IF EXISTS tenant_modify_temperature_logs ON public.temperature_logs;
    CREATE POLICY tenant_modify_temperature_logs
      ON public.temperature_logs
      FOR ALL
      USING (
        public.is_service_role()
        OR matches_current_tenant(company_id)
      )
      WITH CHECK (
        public.is_service_role()
        OR matches_current_tenant(company_id)
      );

    RAISE NOTICE 'Created temperature_logs table with RLS policies';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, sites, profiles) do not exist yet - skipping temperature_logs';
  END IF;
END $$;
