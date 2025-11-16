-- ============================================================================
-- Migration: 20251112130000_fix_eho_compliance_summary_types.sql
-- Description: Fix type mismatches in get_compliance_summary function
--              Ensure all return types match exactly and handle NULL values
-- ============================================================================

-- Fix get_compliance_summary function - ensure all types match exactly
create or replace function public.get_compliance_summary(
  p_site_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  category text,
  total_tasks integer,
  completed_tasks integer,
  missed_tasks integer,
  completion_rate numeric,
  average_completion_time_seconds integer,
  flagged_completions integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with task_counts as (
    select
      coalesce(tt.category, 'uncategorized') as category,
      count(distinct ct.id)::integer as total_tasks,
      count(distinct tcr.id)::integer as completed_tasks,
      count(distinct case when tcr.flagged then tcr.id end)::integer as flagged_completions,
      coalesce(avg(tcr.duration_seconds)::integer, 0) as avg_duration
    from public.checklist_tasks ct
    left join public.task_templates tt on tt.id = ct.template_id
    left join public.task_completion_records tcr on tcr.task_id = ct.id
    where ct.site_id = p_site_id
      and ct.due_date >= p_start_date
      and ct.due_date <= p_end_date
    group by coalesce(tt.category, 'uncategorized')
  )
  select
    tc.category::text,
    tc.total_tasks::integer,
    tc.completed_tasks::integer,
    (tc.total_tasks - tc.completed_tasks)::integer as missed_tasks,
    case
      when tc.total_tasks > 0 then
        round((tc.completed_tasks::numeric / tc.total_tasks::numeric) * 100, 1)::numeric
      else 0::numeric
    end as completion_rate,
    tc.avg_duration::integer as average_completion_time_seconds,
    tc.flagged_completions::integer
  from task_counts tc
  order by tc.category;
end;
$$;




