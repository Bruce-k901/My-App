-- Checklist items define dynamic form fields per task
create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  label text not null,
  input_type text not null,
  required boolean default false,
  options text[]
);

alter table public.checklist_items enable row level security;

-- Select items only when the user can see the task for their company
create policy if not exists "Checklist items readable by company members" on public.checklist_items
  for select using (
    exists(
      select 1 from public.tasks t
      where t.id = checklist_items.task_id
        and (t.company_id = auth.jwt() ->> 'company_id')::uuid
    )
  );

-- Insert/update only within the same company scope via parent task
create policy if not exists "Checklist items writable by company members" on public.checklist_items
  for insert with check (
    exists(
      select 1 from public.tasks t
      where t.id = checklist_items.task_id
        and (t.company_id = auth.jwt() ->> 'company_id')::uuid
    )
  );

create policy if not exists "Checklist items updatable by company members" on public.checklist_items
  for update using (
    exists(
      select 1 from public.tasks t
      where t.id = checklist_items.task_id
        and (t.company_id = auth.jwt() ->> 'company_id')::uuid
    )
  );