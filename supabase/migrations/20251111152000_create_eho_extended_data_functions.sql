-- ============================================================================
-- Migration: 20251111152000_create_eho_extended_data_functions.sql
-- Description: Extended data functions for comprehensive EHO reports
-- ============================================================================

-- Function: Get Training Records
create or replace function public.get_eho_training_records(
  p_site_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  staff_id uuid,
  staff_name text,
  training_type text,
  completed_at timestamptz,
  expiry_date date,
  certificate_number text,
  provider text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    p.id as staff_id,
    p.full_name as staff_name,
    tc.certificate_type as training_type,
    tc.completed_at,
    tc.expiry_date,
    tc.certificate_number,
    tc.provider
  from public.profiles p
  inner join public.training_certificates tc on tc.profile_id = p.id
  inner join public.user_site_access usa on usa.auth_user_id = p.auth_user_id
  where usa.site_id = p_site_id
    and tc.completed_at::date >= p_start_date
    and tc.completed_at::date <= p_end_date
    and (
      public.has_site_access(p_site_id)
      or public.is_service_role()
    )
  order by p.full_name, tc.completed_at desc;
end;
$$;

-- Function: Get Temperature Records
create or replace function public.get_eho_temperature_records(
  p_site_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  recorded_at timestamptz,
  asset_name text,
  asset_type text,
  reading numeric,
  unit text,
  status text,
  recorded_by_name text,
  evaluation jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    tl.recorded_at,
    a.name as asset_name,
    a.asset_type,
    tl.reading,
    tl.unit,
    tl.status,
    p.full_name as recorded_by_name,
    tl.meta->'evaluation' as evaluation
  from public.temperature_logs tl
  left join public.assets a on a.id = tl.asset_id
  left join public.profiles p on p.id = tl.recorded_by
  where tl.site_id = p_site_id
    and tl.recorded_at::date >= p_start_date
    and tl.recorded_at::date <= p_end_date
    and (
      public.has_site_access(p_site_id)
      or public.is_service_role()
    )
  order by tl.recorded_at desc;
end;
$$;

-- Function: Get Incident Reports
create or replace function public.get_eho_incident_reports(
  p_site_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  incident_id uuid,
  incident_type text,
  occurred_at timestamptz,
  reported_by_name text,
  description text,
  severity text,
  riddor_category text,
  status text,
  follow_up_actions text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    i.id as incident_id,
    i.incident_type,
    i.occurred_at,
    p.full_name as reported_by_name,
    i.description,
    i.severity,
    i.riddor_category,
    i.status,
    i.follow_up_actions
  from public.incidents i
  left join public.profiles p on p.id = i.reported_by
  where i.site_id = p_site_id
    and i.occurred_at::date >= p_start_date
    and i.occurred_at::date <= p_end_date
    and (
      public.has_site_access(p_site_id)
      or public.is_service_role()
    )
  order by i.occurred_at desc;
end;
$$;

-- Function: Get Cleaning Schedules (from task completions with cleaning category)
create or replace function public.get_eho_cleaning_records(
  p_site_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  completion_id uuid,
  template_name text,
  completed_at timestamptz,
  completed_by_name text,
  completion_data jsonb,
  due_date date,
  daypart text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    tcr.id as completion_id,
    tt.name as template_name,
    tcr.completed_at,
    p.full_name as completed_by_name,
    tcr.completion_data,
    ct.due_date,
    ct.daypart
  from public.task_completion_records tcr
  inner join public.checklist_tasks ct on ct.id = tcr.task_id
  left join public.task_templates tt on tt.id = tcr.template_id
  left join public.profiles p on p.id = tcr.completed_by
  where tcr.site_id = p_site_id
    and tcr.completed_at::date >= p_start_date
    and tcr.completed_at::date <= p_end_date
    and tt.category = 'cleaning'
    and (
      public.has_site_access(p_site_id)
      or public.is_service_role()
    )
  order by tcr.completed_at desc;
end;
$$;

-- Function: Get Pest Control Records (from task completions with pest control template)
create or replace function public.get_eho_pest_control_records(
  p_site_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  completion_id uuid,
  completed_at timestamptz,
  completed_by_name text,
  assessment_result text,
  findings text,
  actions_taken text,
  completion_data jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    tcr.id as completion_id,
    tcr.completed_at,
    p.full_name as completed_by_name,
    tcr.completion_data->>'overall_assessment' as assessment_result,
    tcr.completion_data->>'notes' as findings,
    tcr.completion_data->>'corrective_actions' as actions_taken,
    tcr.completion_data
  from public.task_completion_records tcr
  inner join public.checklist_tasks ct on ct.id = tcr.task_id
  left join public.task_templates tt on tt.id = tcr.template_id
  left join public.profiles p on p.id = tcr.completed_by
  where tcr.site_id = p_site_id
    and tcr.completed_at::date >= p_start_date
    and tcr.completed_at::date <= p_end_date
    and (tt.slug = 'weekly_pest_control_inspection' or tt.category = 'food_safety' and tt.name ilike '%pest%')
    and (
      public.has_site_access(p_site_id)
      or public.is_service_role()
    )
  order by tcr.completed_at desc;
end;
$$;

-- Function: Get Opening/Closing Checklists
create or replace function public.get_eho_opening_closing_checklists(
  p_site_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  completion_id uuid,
  checklist_type text,
  completed_at timestamptz,
  completed_by_name text,
  completion_data jsonb,
  daypart text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    tcr.id as completion_id,
    case
      when ct.daypart = 'before_open' then 'Opening Checklist'
      when ct.daypart = 'after_service' then 'Closing Checklist'
      else 'Other'
    end as checklist_type,
    tcr.completed_at,
    p.full_name as completed_by_name,
    tcr.completion_data,
    ct.daypart
  from public.task_completion_records tcr
  inner join public.checklist_tasks ct on ct.id = tcr.task_id
  left join public.profiles p on p.id = tcr.completed_by
  where tcr.site_id = p_site_id
    and tcr.completed_at::date >= p_start_date
    and tcr.completed_at::date <= p_end_date
    and ct.daypart in ('before_open', 'after_service')
    and (
      public.has_site_access(p_site_id)
      or public.is_service_role()
    )
  order by tcr.completed_at desc;
end;
$$;

-- Function: Get Supplier/Delivery Records (placeholder - to be implemented when supplier system is built)
create or replace function public.get_eho_supplier_delivery_records(
  p_site_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  delivery_id uuid,
  supplier_name text,
  delivery_date date,
  received_by_name text,
  items_received text,
  temperature_check text,
  condition_check text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Placeholder: Returns empty result set
  -- TODO: Implement when supplier/delivery system is built
  return query
  select
    null::uuid as delivery_id,
    null::text as supplier_name,
    null::date as delivery_date,
    null::text as received_by_name,
    null::text as items_received,
    null::text as temperature_check,
    null::text as condition_check
  where false; -- Always returns no rows
end;
$$;

-- Function: Get Maintenance Logs (placeholder - check if maintenance_logs table exists)
create or replace function public.get_eho_maintenance_logs(
  p_site_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  maintenance_id uuid,
  asset_name text,
  maintenance_type text,
  completed_at timestamptz,
  completed_by_name text,
  description text,
  next_due_date date
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Check if maintenance_logs table exists, otherwise return empty
  -- TODO: Implement when maintenance_logs table is created
  return query
  select
    null::uuid as maintenance_id,
    null::text as asset_name,
    null::text as maintenance_type,
    null::timestamptz as completed_at,
    null::text as completed_by_name,
    null::text as description,
    null::date as next_due_date
  where false; -- Always returns no rows
end;
$$;

-- Function: Get Staff Health Declarations (placeholder - to be implemented)
create or replace function public.get_eho_staff_health_declarations(
  p_site_id uuid,
  p_start_date date,
  p_end_date date
)
returns table (
  declaration_id uuid,
  staff_name text,
  declaration_date date,
  health_status text,
  symptoms text,
  fit_for_work boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Placeholder: Returns empty result set
  -- TODO: Implement when staff health declaration system is built
  return query
  select
    null::uuid as declaration_id,
    null::text as staff_name,
    null::date as declaration_date,
    null::text as health_status,
    null::text as symptoms,
    null::boolean as fit_for_work
  where false; -- Always returns no rows
end;
$$;

-- Function: Get Allergen Information (placeholder - to be implemented)
create or replace function public.get_eho_allergen_information(
  p_site_id uuid
)
returns table (
  allergen_name text,
  present_in_items text[],
  procedures text,
  last_updated timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Placeholder: Returns empty result set
  -- TODO: Implement when allergen management system is built
  return query
  select
    null::text as allergen_name,
    null::text[] as present_in_items,
    null::text as procedures,
    null::timestamptz as last_updated
  where false; -- Always returns no rows
end;
$$;

-- Grant execute permissions
grant execute on function public.get_eho_training_records(uuid, date, date) to authenticated;
grant execute on function public.get_eho_temperature_records(uuid, date, date) to authenticated;
grant execute on function public.get_eho_incident_reports(uuid, date, date) to authenticated;
grant execute on function public.get_eho_cleaning_records(uuid, date, date) to authenticated;
grant execute on function public.get_eho_pest_control_records(uuid, date, date) to authenticated;
grant execute on function public.get_eho_opening_closing_checklists(uuid, date, date) to authenticated;
grant execute on function public.get_eho_supplier_delivery_records(uuid, date, date) to authenticated;
grant execute on function public.get_eho_maintenance_logs(uuid, date, date) to authenticated;
grant execute on function public.get_eho_staff_health_declarations(uuid, date, date) to authenticated;
grant execute on function public.get_eho_allergen_information(uuid) to authenticated;

