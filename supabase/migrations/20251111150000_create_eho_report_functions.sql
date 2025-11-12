-- ============================================================================
-- Migration: 20251111150000_create_eho_report_functions.sql
-- Description: Create RPC functions for EHO Readiness Pack data retrieval
-- ============================================================================

-- Function 1: Get EHO Report Data
-- Returns all task completions with user info, checklist data, evidence URLs
create or replace function public.get_eho_report_data(
  p_site_id uuid,
  p_start_date date,
  p_end_date date,
  p_template_categories text[] default null -- e.g., ['food_safety', 'h_and_s']
)
returns table (
  completion_id uuid,
  task_id uuid,
  template_id uuid,
  template_name text,
  template_category text,
  template_slug text,
  completed_at timestamptz,
  completed_by_name text,
  completed_by_role text,
  due_date date,
  due_time time,
  daypart text,
  completion_data jsonb,
  evidence_attachments text[],
  flagged boolean,
  flag_reason text,
  duration_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    tcr.id as completion_id,
    tcr.task_id,
    tcr.template_id,
    tt.name as template_name,
    tt.category as template_category,
    tt.slug as template_slug,
    tcr.completed_at,
    p.full_name as completed_by_name,
    p.role as completed_by_role,
    ct.due_date,
    ct.due_time,
    ct.daypart,
    tcr.completion_data,
    tcr.evidence_attachments,
    tcr.flagged,
    tcr.flag_reason,
    tcr.duration_seconds
  from public.task_completion_records tcr
  inner join public.checklist_tasks ct on ct.id = tcr.task_id
  left join public.task_templates tt on tt.id = tcr.template_id
  left join public.profiles p on p.id = tcr.completed_by
  where tcr.site_id = p_site_id
    and tcr.completed_at::date >= p_start_date
    and tcr.completed_at::date <= p_end_date
    and (p_template_categories is null or tt.category = any(p_template_categories))
    and (
      -- RLS check: user has access to this site
      public.has_site_access(p_site_id)
      or public.is_service_role()
    )
  order by tcr.completed_at desc, tt.category, tt.name;
end;
$$;

-- Function 2: Get Compliance Summary
-- Returns total tasks, completed %, missed tasks, by category breakdown
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
      count(distinct ct.id) as total_tasks,
      count(distinct tcr.id) as completed_tasks,
      count(distinct case when tcr.flagged then tcr.id end) as flagged_completions,
      avg(tcr.duration_seconds)::integer as avg_duration
    from public.checklist_tasks ct
    left join public.task_templates tt on tt.id = ct.template_id
    left join public.task_completion_records tcr on tcr.task_id = ct.id
    where ct.site_id = p_site_id
      and ct.due_date >= p_start_date
      and ct.due_date <= p_end_date
    group by coalesce(tt.category, 'uncategorized')
  )
  select
    tc.category,
    tc.total_tasks,
    tc.completed_tasks,
    (tc.total_tasks - tc.completed_tasks) as missed_tasks,
    case
      when tc.total_tasks > 0 then
        round((tc.completed_tasks::numeric / tc.total_tasks::numeric) * 100, 1)
      else 0
    end as completion_rate,
    tc.avg_duration as average_completion_time_seconds,
    tc.flagged_completions
  from task_counts tc
  order by tc.category;
end;
$$;

-- Function 3: Get Evidence Files
-- Returns signed URLs for all evidence photos from storage buckets
-- Note: This function returns the file paths - actual signed URLs should be generated
-- in the application layer using Supabase Storage API
create or replace function public.get_evidence_files(
  p_completion_ids uuid[]
)
returns table (
  completion_id uuid,
  evidence_path text,
  evidence_type text,
  file_size_bytes bigint,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    tcr.id as completion_id,
    unnest(tcr.evidence_attachments) as evidence_path,
    'photo' as evidence_type, -- Could be enhanced to detect type from path
    null::bigint as file_size_bytes, -- Would need to query storage metadata
    tcr.completed_at as created_at
  from public.task_completion_records tcr
  where tcr.id = any(p_completion_ids)
    and tcr.evidence_attachments is not null
    and array_length(tcr.evidence_attachments, 1) > 0
    and (
      public.has_site_access(tcr.site_id)
      or public.is_service_role()
    );
end;
$$;

-- Grant execute permissions
grant execute on function public.get_eho_report_data(uuid, date, date, text[]) to authenticated;
grant execute on function public.get_compliance_summary(uuid, date, date) to authenticated;
grant execute on function public.get_evidence_files(uuid[]) to authenticated;


