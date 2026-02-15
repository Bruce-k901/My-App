-- Create table for linking templates to sites
create table if not exists template_site_assignments (
  id uuid primary key default uuid_generate_v4(),
  template_id uuid references task_templates(id) on delete cascade,
  site_id uuid references sites(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  created_at timestamptz default now(),
  unique(template_id, site_id)
);

-- Add RLS policies
alter table template_site_assignments enable row level security;

create policy "Users can view template assignments for their company"
  on template_site_assignments for select
  using (company_id = (select company_id from profiles where auth_user_id = auth.uid()));

create policy "Users can create template assignments for their company"
  on template_site_assignments for insert
  with check (company_id = (select company_id from profiles where auth_user_id = auth.uid()));

create policy "Users can update template assignments for their company"
  on template_site_assignments for update
  using (company_id = (select company_id from profiles where auth_user_id = auth.uid()));

create policy "Users can delete template assignments for their company"
  on template_site_assignments for delete
  using (company_id = (select company_id from profiles where auth_user_id = auth.uid()));

-- Add indexes for performance
create index if not exists idx_template_site_assignments_template_id on template_site_assignments(template_id);
create index if not exists idx_template_site_assignments_site_id on template_site_assignments(site_id);
create index if not exists idx_template_site_assignments_company_id on template_site_assignments(company_id);
