-- Maintenance Contractors schema and RLS policies

create table if not exists public.maintenance_contractors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  category text not null,
  contractor_name text not null,
  contact_name text,
  email text,
  phone text,
  emergency_phone text,
  address text,
  linked_sites uuid[] references public.sites(id),
  contract_start date,
  contract_expiry date,
  contract_file text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at current
create or replace function public.maintenance_contractors_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

drop trigger if exists trg_maintenance_contractors_updated on public.maintenance_contractors;
create trigger trg_maintenance_contractors_updated
before update on public.maintenance_contractors
for each row execute function public.maintenance_contractors_set_updated_at();

alter table public.maintenance_contractors enable row level security;

-- Owners/admins can read within their company
create policy if not exists maintenance_contractors_select_company
  on public.maintenance_contractors
  for select
  using (
    -- Any company member can read contractors; also allow company owners
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.company_id = maintenance_contractors.company_id
    )
    or exists (
      select 1 from public.companies c
      where c.id = maintenance_contractors.company_id
        and (c.user_id = auth.uid() or c.created_by = auth.uid())
    )
  );

-- Owners/admins can insert within their company
create policy if not exists maintenance_contractors_insert_company
  on public.maintenance_contractors
  for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.company_id = maintenance_contractors.company_id
        and p.role in ('owner','admin')
    )
  );

-- Owners/admins can update within their company
create policy if not exists maintenance_contractors_update_company
  on public.maintenance_contractors
  for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.company_id = maintenance_contractors.company_id
        and p.role in ('owner','admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.company_id = maintenance_contractors.company_id
        and p.role in ('owner','admin')
    )
  );

-- Owners/admins can delete within their company
create policy if not exists maintenance_contractors_delete_company
  on public.maintenance_contractors
  for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.company_id = maintenance_contractors.company_id
        and p.role in ('owner','admin')
    )
  );

create index if not exists idx_maintenance_contractors_company on public.maintenance_contractors(company_id);
create index if not exists idx_maintenance_contractors_name on public.maintenance_contractors(contractor_name);