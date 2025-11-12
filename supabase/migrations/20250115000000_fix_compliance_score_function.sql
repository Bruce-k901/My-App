-- ============================================================================
-- Migration: Fix compliance score function to use checklist_tasks
-- Description: Updates compute_site_compliance_score to use the correct table
-- ============================================================================

set check_function_bodies = off;

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
      -- Open critical incidents
      select site_id, count(*) as count
      from public.incidents
      where severity in ('high','critical')
        and status != 'closed'
      group by site_id
    ) ci on ci.site_id = s.id
    left join (
      -- Overdue tasks (pending/in_progress tasks with due_date before target_date)
      select site_id, count(*) as count
      from public.checklist_tasks
      where status in ('pending', 'in_progress')
        and due_date < target_date
      group by site_id
    ) ca on ca.site_id = s.id
    left join (
      -- Missed daily checklists (yesterday's incomplete tasks)
      select site_id, count(*) as count
      from public.checklist_tasks
      where status in ('pending', 'in_progress')
        and due_date = target_date - interval '1 day'
      group by site_id
    ) dc on dc.site_id = s.id
    left join (
      -- Temperature breaches in last 7 days
      select site_id, count(*) as count
      from public.temperature_breach_actions
      where status in ('pending', 'acknowledged')
        and created_at >= window_start
        and created_at < target_date + interval '1 day'
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
  is 'Materialises daily compliance score per site using checklist_tasks table. Formula: 100 - 10*critical_incidents - 2*overdue_tasks - 1*missed_tasks - 0.5*temp_breaches';

grant execute on function public.compute_site_compliance_score(date) to service_role;
revoke execute on function public.compute_site_compliance_score(date) from anon, authenticated;

