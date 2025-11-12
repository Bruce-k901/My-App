-- ============================================================================
-- Migration: 20251111115000_create_task_templates.sql
-- Description: Ensures task template infrastructure exists with seed data
-- ============================================================================

create table if not exists public.task_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  name text not null,
  slug text not null,
  description text,
  category text not null,
  audit_category text,
  frequency text not null,
  time_of_day text,
  due_time text,
  start_time text,
  dayparts text[] default '{}'::text[],
  days_of_week smallint[] default '{}'::smallint[],
  recurrence_pattern jsonb,
  assigned_to_role text,
  assigned_to_user_id uuid references public.profiles(id) on delete set null,
  asset_id uuid references public.assets(id) on delete set null,
  asset_type text,
  instructions text,
  repeatable_field_name text,
  evidence_types text[],
  requires_sop boolean default false,
  requires_risk_assessment boolean default false,
  linked_sop_id uuid references public.sop_entries(id) on delete set null,
  linked_risk_id uuid references public.risk_assessments(id) on delete set null,
  compliance_standard text,
  is_critical boolean default false,
  triggers_contractor_on_failure boolean default false,
  contractor_type text,
  audience text,
  tags text[],
  weight numeric,
  is_active boolean default true,
  is_template_library boolean default false,
  active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists task_templates_company_slug_idx
  on public.task_templates (coalesce(company_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);

create table if not exists public.template_fields (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.task_templates(id) on delete cascade,
  field_name text not null,
  field_type text not null,
  label text not null,
  placeholder text,
  help_text text,
  options jsonb,
  required boolean default false,
  field_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists template_fields_template_idx
  on public.template_fields (template_id, field_order);

create table if not exists public.template_repeatable_labels (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.task_templates(id) on delete cascade,
  label text not null,
  label_value text,
  is_default boolean default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists template_repeatable_labels_template_idx
  on public.template_repeatable_labels (template_id, display_order);

alter table public.task_templates enable row level security;
alter table public.template_fields enable row level security;
alter table public.template_repeatable_labels enable row level security;

drop policy if exists tenant_select_task_templates on public.task_templates;
create policy tenant_select_task_templates
  on public.task_templates
  for select
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
    or company_id is null
  );

drop policy if exists tenant_modify_task_templates on public.task_templates;
create policy tenant_modify_task_templates
  on public.task_templates
  for all
  using (
    public.is_service_role()
    or matches_current_tenant(company_id)
  )
  with check (
    public.is_service_role()
    or matches_current_tenant(company_id)
  );

drop policy if exists tenant_select_template_fields on public.template_fields;
create policy tenant_select_template_fields
  on public.template_fields
  for select
  using (
    public.is_service_role()
    or exists (
      select 1 from public.task_templates t
      where t.id = template_fields.template_id
        and (public.is_service_role()
          or matches_current_tenant(t.company_id)
          or t.company_id is null)
    )
  );

drop policy if exists tenant_modify_template_fields on public.template_fields;
create policy tenant_modify_template_fields
  on public.template_fields
  for all
  using (
    public.is_service_role()
    or exists (
      select 1 from public.task_templates t
      where t.id = template_fields.template_id
        and (public.is_service_role()
          or matches_current_tenant(t.company_id))
    )
  )
  with check (
    public.is_service_role()
    or exists (
      select 1 from public.task_templates t
      where t.id = template_fields.template_id
        and (public.is_service_role()
          or matches_current_tenant(t.company_id))
    )
  );

drop policy if exists tenant_select_template_repeatable_labels on public.template_repeatable_labels;
create policy tenant_select_template_repeatable_labels
  on public.template_repeatable_labels
  for select
  using (
    public.is_service_role()
    or exists (
      select 1 from public.task_templates t
      where t.id = template_repeatable_labels.template_id
        and (public.is_service_role()
          or matches_current_tenant(t.company_id)
          or t.company_id is null)
    )
  );

drop policy if exists tenant_modify_template_repeatable_labels on public.template_repeatable_labels;
create policy tenant_modify_template_repeatable_labels
  on public.template_repeatable_labels
  for all
  using (
    public.is_service_role()
    or exists (
      select 1 from public.task_templates t
      where t.id = template_repeatable_labels.template_id
        and (public.is_service_role()
          or matches_current_tenant(t.company_id))
    )
  )
  with check (
    public.is_service_role()
    or exists (
      select 1 from public.task_templates t
      where t.id = template_repeatable_labels.template_id
        and (public.is_service_role()
          or matches_current_tenant(t.company_id))
    )
  );

-- Seed of default compliance templates handled via seed script once schema exists.


