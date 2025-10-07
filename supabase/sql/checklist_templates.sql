-- Checklist templates schema and RLS policies
-- Holds reusable checklist definitions at company scope, optionally scoped to a site

create table if not exists public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  site_id uuid null references public.sites(id) on delete set null,
  name text not null,
  description text null,
  frequency text null,
  day_part text null,
  role_required text null,
  category text null,
  form_schema jsonb null,
  active boolean not null default true,
  library_id uuid null references public.task_library(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpful indexes
create index if not exists idx_checklist_templates_company_active on public.checklist_templates(company_id, active);
create index if not exists idx_checklist_templates_site on public.checklist_templates(site_id);
create index if not exists idx_checklist_templates_category on public.checklist_templates(category);
create index if not exists idx_checklist_templates_library on public.checklist_templates(library_id);

-- Maintain updated_at automatically
create or replace function public.checklist_templates_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

drop trigger if exists trg_checklist_templates_updated on public.checklist_templates;
create trigger trg_checklist_templates_updated
before update on public.checklist_templates
for each row execute function public.checklist_templates_set_updated_at();

-- Row Level Security
alter table public.checklist_templates enable row level security;

-- Company isolation: read
create policy if not exists checklist_templates_select_company
  on public.checklist_templates
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.company_id = checklist_templates.company_id
    )
  );

-- Company isolation: insert
create policy if not exists checklist_templates_insert_company
  on public.checklist_templates
  for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.company_id = checklist_templates.company_id
    )
  );

-- Company isolation: update
create policy if not exists checklist_templates_update_company
  on public.checklist_templates
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.company_id = checklist_templates.company_id
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.company_id = checklist_templates.company_id
    )
  );