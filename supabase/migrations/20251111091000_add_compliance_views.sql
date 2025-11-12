-- ============================================================================
-- Migration: 20251111091000_add_compliance_views.sql
-- Description: Adds helper views for compliance score exposure
-- ============================================================================

set check_function_bodies = off;

drop view if exists public.site_compliance_score_latest cascade;
create view public.site_compliance_score_latest
with (security_barrier = true)
as
  select distinct on (scs.site_id)
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
  from public.site_compliance_score scs
  order by scs.site_id, scs.score_date desc, scs.created_at desc;

comment on view public.site_compliance_score_latest is 'Latest compliance score snapshot per site';

drop view if exists public.tenant_compliance_overview cascade;
create view public.tenant_compliance_overview
with (security_barrier = true)
as
  select
    scs.tenant_id,
    min(scs.score_date) filter (where scs.score_date >= current_date - interval '30 day') as first_score_date,
    max(scs.score_date) as latest_score_date,
    avg(scs.score) as average_score,
    min(scs.score) as lowest_score,
    max(scs.score) as highest_score,
    sum(scs.open_critical_incidents) filter (where scs.score_date = current_date) as open_critical_incidents_today,
    sum(scs.overdue_corrective_actions) filter (where scs.score_date = current_date) as overdue_corrective_actions_today,
    count(distinct scs.site_id) as site_count
  from public.site_compliance_score scs
  group by scs.tenant_id;

comment on view public.tenant_compliance_overview is 'Aggregated compliance score summary per tenant';


