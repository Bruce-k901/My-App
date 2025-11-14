-- ============================================================================
-- Migration: 20251111090000_add_site_compliance_score.sql
-- Description: Adds site compliance score materialisation table and function
-- ============================================================================

set check_function_bodies = off;

create table if not exists public.site_compliance_score (
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

comment on table public.site_compliance_score is 'Daily compliance score snapshots per site';

create index if not exists site_compliance_score_site_date_idx
  on public.site_compliance_score (site_id, score_date desc);

drop function if exists public.compute_site_compliance_score(date);

create or replace function public.compute_site_compliance_score(target_date date default current_date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  score_record record;
  window_start date := target_date - interval '6 day';
begin
  delete from public.site_compliance_score where score_date = target_date;

  for score_record in
    select
      s.id as site_id,
      s.company_id as tenant_id,
      coalesce(ci.count, 0) as open_critical_incidents,
      coalesce(ca.count, 0) as overdue_corrective_actions,
      coalesce(dc.count, 0) as missed_daily_checklists,
      coalesce(tb.count, 0) as temperature_breaches_last_7d
    from public.sites s
    left join (
      select site_id, count(*) as count
      from public.incidents
      where severity in ('high','critical')
        and status != 'closed'
      group by site_id
    ) ci on ci.site_id = s.id
    left join (
      select site_id, count(*) as count
      from public.tasks
      where status = 'overdue'
        and due_date < target_date
      group by site_id
    ) ca on ca.site_id = s.id
    left join (
      select site_id, count(*) as count
      from public.tasks
      where status in ('missed','late')
        and due_date = target_date
      group by site_id
    ) dc on dc.site_id = s.id
    left join (
      select site_id, count(*) as count
      from public.temperature_logs
      where status = 'breach'
        and recorded_at >= window_start
        and recorded_at < target_date + interval '1 day'
      group by site_id
    ) tb on tb.site_id = s.id
  loop
    insert into public.site_compliance_score (
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
    values (
      score_record.tenant_id,
      score_record.site_id,
      target_date,
      greatest(
        0,
        least(
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
  end loop;
end;
$$;

comment on function public.compute_site_compliance_score(date)
  is 'Materialises daily compliance score per site using the weighted formula';

grant execute on function public.compute_site_compliance_score(date) to service_role;
revoke execute on function public.compute_site_compliance_score(date) from anon, authenticated;

-- table policies

alter table public.site_compliance_score enable row level security;

drop policy if exists tenant_select_site_compliance_score on public.site_compliance_score;
create policy tenant_select_site_compliance_score
  on public.site_compliance_score
  for select
  using (
    tenant_id = public.current_tenant()
    or public.is_service_role()
  );

drop policy if exists tenant_insert_site_compliance_score on public.site_compliance_score;
create policy tenant_insert_site_compliance_score
  on public.site_compliance_score
  for insert
  with check (public.is_service_role());

drop policy if exists tenant_update_site_compliance_score on public.site_compliance_score;
create policy tenant_update_site_compliance_score
  on public.site_compliance_score
  for update
  using (public.is_service_role())
  with check (public.is_service_role());

drop policy if exists tenant_delete_site_compliance_score on public.site_compliance_score;
create policy tenant_delete_site_compliance_score
  on public.site_compliance_score
  for delete
  using (public.is_service_role());

-- create cron job via supabase CLI (documented in deploy guide)
-- supabase db remote commit/push will register the migration; cron job should be installed via supabase cron schedule




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



