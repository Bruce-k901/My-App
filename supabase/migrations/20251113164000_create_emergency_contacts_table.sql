-- ============================================================================
-- Migration: Emergency Contacts Table
-- Description: Stores emergency contact information for display on notice boards
-- ============================================================================

begin;

-- Create emergency_contacts table
create table if not exists public.emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  site_id uuid references public.sites(id) on delete cascade, -- NULL = company-wide, UUID = site-specific
  
  -- Contact Information
  contact_type text not null check (contact_type in ('first_aider', 'manager', 'emergency_services', 'utility', 'other')),
  name text not null,
  phone_number text not null,
  email text,
  role_title text, -- e.g., "First Aider", "Site Manager", "Gas Emergency"
  notes text, -- Additional information
  
  -- Display Settings
  display_order integer default 0, -- Order for display on notice boards
  is_active boolean default true,
  language text default 'en', -- For multi-language support
  
  -- Metadata
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null
);

-- Create indexes
create index if not exists idx_emergency_contacts_company_id on public.emergency_contacts(company_id);
create index if not exists idx_emergency_contacts_site_id on public.emergency_contacts(site_id);
create index if not exists idx_emergency_contacts_active on public.emergency_contacts(company_id, site_id, is_active) where is_active = true;

-- Enable RLS
alter table public.emergency_contacts enable row level security;

-- RLS Policies
create policy emergency_contacts_select on public.emergency_contacts
  for select using (
    company_id in (
      select company_id from public.profiles where id = auth.uid()
    )
  );

create policy emergency_contacts_insert on public.emergency_contacts
  for insert with check (
    company_id in (
      select company_id from public.profiles 
      where id = auth.uid() 
        and role in ('owner', 'admin', 'manager')
    )
  );

create policy emergency_contacts_update on public.emergency_contacts
  for update using (
    company_id in (
      select company_id from public.profiles 
      where id = auth.uid() 
        and role in ('owner', 'admin', 'manager')
    )
  );

create policy emergency_contacts_delete on public.emergency_contacts
  for delete using (
    company_id in (
      select company_id from public.profiles 
      where id = auth.uid() 
        and role in ('owner', 'admin', 'manager')
    )
  );

-- Create updated_at trigger
create or replace function update_emergency_contacts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$ language plpgsql;

create trigger update_emergency_contacts_timestamp
  before update on public.emergency_contacts
  for each row
  execute function update_emergency_contacts_updated_at();

commit;

