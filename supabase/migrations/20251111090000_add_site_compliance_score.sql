-- ============================================================================
-- Migration: 20251111090000_add_site_compliance_score.sql
-- Description: Adds site compliance score materialisation table and function
-- ============================================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN

    SET check_function_bodies = off;

    CREATE TABLE IF NOT EXISTS public.site_compliance_score (
      id uuid primary key default gen_random_uuid(),
      tenant_id uuid not null references public.companies(id) on delete cascade,
      site_id uuid not null references public.sites(id) on delete cascade,
      score_date date not null,
      score numeric(5,2) not null,
      open_critical_incidents integer not null default 0,
      overdue_corrective_actions integer not null default 0,
      missed_daily_checklists integer not null default 0,
      temperature_breaches_last_7d integer not null default 0,
      breakdown jsonb not null default '{}'::jsonb,
      created_at timestamptz not null default now(),
      unique (site_id, score_date)
    );

    COMMENT ON TABLE public.site_compliance_score IS 'Daily compliance score snapshots per site';

    CREATE INDEX IF NOT EXISTS site_compliance_score_site_date_idx
      ON public.site_compliance_score (site_id, score_date desc);

    DROP FUNCTION IF EXISTS public.compute_site_compliance_score(date);

    CREATE OR REPLACE FUNCTION public.compute_site_compliance_score(target_date date default current_date)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $func$
    DECLARE
      score_record record;
      window_start date := target_date - interval '6 day';
    BEGIN
      DELETE FROM public.site_compliance_score WHERE score_date = target_date;

      FOR score_record IN
        SELECT
          s.id as site_id,
          s.company_id as tenant_id,
          COALESCE(ci.count, 0) as open_critical_incidents,
          COALESCE(ca.count, 0) as overdue_corrective_actions,
          COALESCE(dc.count, 0) as missed_daily_checklists,
          COALESCE(tb.count, 0) as temperature_breaches_last_7d
        FROM public.sites s
        LEFT JOIN (
          SELECT site_id, count(*) as count
          FROM public.incidents
          WHERE severity IN ('high','critical')
            AND status != 'closed'
          GROUP BY site_id
        ) ci ON ci.site_id = s.id
        LEFT JOIN (
          SELECT site_id, count(*) as count
          FROM public.tasks
          WHERE status = 'overdue'
            AND due_date < target_date
          GROUP BY site_id
        ) ca ON ca.site_id = s.id
        LEFT JOIN (
          SELECT site_id, count(*) as count
          FROM public.tasks
          WHERE status IN ('missed','late')
            AND due_date = target_date
          GROUP BY site_id
        ) dc ON dc.site_id = s.id
        LEFT JOIN (
          SELECT site_id, count(*) as count
          FROM public.temperature_logs
          WHERE status = 'breach'
            AND recorded_at >= window_start
            AND recorded_at < target_date + interval '1 day'
          GROUP BY site_id
        ) tb ON tb.site_id = s.id
      LOOP
        INSERT INTO public.site_compliance_score (
          tenant_id,
          site_id,
          score_date,
          score,
          open_critical_incidents,
          overdue_corrective_actions,
          missed_daily_checklists,
          temperature_breaches_last_7d,
          breakdown
        )
        VALUES (
          score_record.tenant_id,
          score_record.site_id,
          target_date,
          GREATEST(
            0,
            LEAST(
              100,
              100
              - (10 * score_record.open_critical_incidents)
              - (2 * score_record.overdue_corrective_actions)
              - (1 * score_record.missed_daily_checklists)
              - (0.5 * score_record.temperature_breaches_last_7d)
            )
          ),
          score_record.open_critical_incidents,
          score_record.overdue_corrective_actions,
          score_record.missed_daily_checklists,
          score_record.temperature_breaches_last_7d,
          jsonb_build_object(
            'formula', '100 - 10*critical_incidents - 2*overdue_corrective_actions - 1*missed_daily_checklists - 0.5*temperature_breaches_last_7d',
            'open_critical_incidents', score_record.open_critical_incidents,
            'overdue_corrective_actions', score_record.overdue_corrective_actions,
            'missed_daily_checklists', score_record.missed_daily_checklists,
            'temperature_breaches_last_7d', score_record.temperature_breaches_last_7d
          )
        );
      END LOOP;
    END;
    $func$;

    COMMENT ON FUNCTION public.compute_site_compliance_score(date)
      IS 'Materialises daily compliance score per site using the weighted formula';

    GRANT EXECUTE ON FUNCTION public.compute_site_compliance_score(date) TO service_role;
    REVOKE EXECUTE ON FUNCTION public.compute_site_compliance_score(date) FROM anon, authenticated;

    -- table policies

    ALTER TABLE public.site_compliance_score ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS tenant_select_site_compliance_score ON public.site_compliance_score;
    CREATE POLICY tenant_select_site_compliance_score
      ON public.site_compliance_score
      FOR SELECT
      USING (
        tenant_id = public.current_tenant()
        OR public.is_service_role()
      );

    DROP POLICY IF EXISTS tenant_insert_site_compliance_score ON public.site_compliance_score;
    CREATE POLICY tenant_insert_site_compliance_score
      ON public.site_compliance_score
      FOR INSERT
      WITH CHECK (public.is_service_role());

    DROP POLICY IF EXISTS tenant_update_site_compliance_score ON public.site_compliance_score;
    CREATE POLICY tenant_update_site_compliance_score
      ON public.site_compliance_score
      FOR UPDATE
      USING (public.is_service_role())
      WITH CHECK (public.is_service_role());

    DROP POLICY IF EXISTS tenant_delete_site_compliance_score ON public.site_compliance_score;
    CREATE POLICY tenant_delete_site_compliance_score
      ON public.site_compliance_score
      FOR DELETE
      USING (public.is_service_role());

    RAISE NOTICE 'Created site_compliance_score table and function with RLS policies';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, sites) do not exist yet - skipping site compliance score';
  END IF;
END $$;

-- create cron job via supabase CLI (documented in deploy guide)
-- supabase db remote commit/push will register the migration; cron job should be installed via supabase cron schedule


