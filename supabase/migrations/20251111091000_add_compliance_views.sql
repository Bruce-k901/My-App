-- ============================================================================
-- Migration: 20251111091000_add_compliance_views.sql
-- Description: Adds helper views for compliance score exposure
-- ============================================================================
-- Note: This migration will be skipped if site_compliance_score table doesn't exist yet

DO $$
BEGIN
  -- Only proceed if site_compliance_score table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'site_compliance_score') THEN

    SET check_function_bodies = off;

    DROP VIEW IF EXISTS public.site_compliance_score_latest CASCADE;
    CREATE VIEW public.site_compliance_score_latest
    WITH (security_barrier = true)
    AS
      SELECT DISTINCT ON (scs.site_id)
        scs.id,
        scs.site_id,
        scs.tenant_id,
        scs.score_date,
        scs.score,
        scs.open_critical_incidents,
        scs.overdue_corrective_actions,
        scs.missed_daily_checklists,
        scs.temperature_breaches_last_7d,
        scs.breakdown,
        scs.created_at
      FROM public.site_compliance_score scs
      ORDER BY scs.site_id, scs.score_date desc, scs.created_at desc;

    COMMENT ON VIEW public.site_compliance_score_latest IS 'Latest compliance score snapshot per site';

    DROP VIEW IF EXISTS public.tenant_compliance_overview CASCADE;
    CREATE VIEW public.tenant_compliance_overview
    WITH (security_barrier = true)
    AS
      SELECT
        scs.tenant_id,
        min(scs.score_date) FILTER (WHERE scs.score_date >= current_date - interval '30 day') as first_score_date,
        max(scs.score_date) as latest_score_date,
        avg(scs.score) as average_score,
        min(scs.score) as lowest_score,
        max(scs.score) as highest_score,
        sum(scs.open_critical_incidents) FILTER (WHERE scs.score_date = current_date) as open_critical_incidents_today,
        sum(scs.overdue_corrective_actions) FILTER (WHERE scs.score_date = current_date) as overdue_corrective_actions_today,
        count(distinct scs.site_id) as site_count
      FROM public.site_compliance_score scs
      GROUP BY scs.tenant_id;

    COMMENT ON VIEW public.tenant_compliance_overview IS 'Aggregated compliance score summary per tenant';

    RAISE NOTICE 'Created compliance views';

  ELSE
    RAISE NOTICE '⚠️ site_compliance_score table does not exist yet - skipping compliance views';
  END IF;
END $$;


