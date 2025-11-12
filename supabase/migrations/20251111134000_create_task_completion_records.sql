-- ============================================================================
-- Migration: 20251111134000_create_task_completion_records.sql
-- Description: Creates task completion ledger mirror used by Completed Tasks page
-- ============================================================================

create table if not exists public.task_completion_records (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.checklist_tasks(id) on delete cascade,
  template_id uuid references public.task_templates(id) on delete set null,
  company_id uuid not null references public.companies(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  completed_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz not null default now(),
  duration_seconds integer,
  completion_data jsonb,
  evidence_attachments jsonb,
  flagged boolean default false,
  flag_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists task_completion_records_company_idx
  on public.task_completion_records (company_id, completed_at desc);

create index if not exists task_completion_records_site_idx
  on public.task_completion_records (site_id, completed_at desc);

alter table public.task_completion_records enable row level security;

drop policy if exists tenant_select_task_completion_records on public.task_completion_records;
create policy tenant_select_task_completion_records
  on public.task_completion_records
  for select
  using (
    public.is_service_role()
    or (
      matches_current_tenant(company_id)
      and (
        site_id is null
        or public.has_site_access(site_id)
      )
    )
  );

drop policy if exists tenant_modify_task_completion_records on public.task_completion_records;
create policy tenant_modify_task_completion_records
  on public.task_completion_records
  for all
  using (
    public.is_service_role()
    or (
      matches_current_tenant(company_id)
      and (
        site_id is null
        or public.has_site_access(site_id)
      )
    )
  )
  with check (
    public.is_service_role()
    or (
      -- Primary check: user has site access (which already validates tenant)
      (
        site_id is not null
        and public.has_site_access(site_id)
      )
      -- Fallback: company_id matches user's profile company (for records without site_id)
      or (
        site_id is null
        and company_id in (
          select company_id from public.profiles 
          where id = auth.uid() or auth_user_id = auth.uid()
        )
      )
      -- Fallback: tenant matches (if JWT has tenant_id claim)
      or (
        matches_current_tenant(company_id)
        and (
          site_id is null
          or public.has_site_access(site_id)
        )
      )
    )
  );
