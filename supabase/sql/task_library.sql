-- Task library holds reusable checklist/task definitions that can be imported
create table if not exists public.task_library (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  name text not null,
  description text,
  frequency text,
  daypart text,
  role_required text,
  category text,
  form_schema jsonb,
  created_at timestamptz not null default now()
);

alter table public.task_library enable row level security;

-- Read within company
create policy if not exists task_library_select_company
  on public.task_library
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.company_id = task_library.company_id
    )
  );

-- Insert/update within company (service role bypasses RLS for admin ops)
create policy if not exists task_library_mutate_company
  on public.task_library
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.company_id = task_library.company_id
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.company_id = task_library.company_id
    )
  );