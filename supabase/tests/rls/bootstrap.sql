-- ============================================================================
-- Bootstrap schema for RLS smoke tests
-- Provides minimal structures required by tenant isolation tests
-- ============================================================================

create extension if not exists "pgcrypto";

create schema if not exists auth;

do $
begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated;
  end if;
end
$;

create or replace function auth.uid()
returns uuid
language sql
stable
as $
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$;

create or replace function auth.role()
returns text
language sql
stable
as $$
  with raw_role as (
    select coalesce(
      nullif(current_setting('request.jwt.claim.role', true), ''),
      nullif(current_setting('role', true), '')
    ) as value
  )
  select case
    when raw_role.value is null then 'service_role'
    when raw_role.value in ('postgres', 'pg_database_owner') then 'service_role'
    else raw_role.value
  end
  from raw_role;
$$;

-- Companies
create table if not exists public.companies (
  id uuid primary key,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.company_regions (
  id uuid primary key,
  company_id uuid references public.companies(id),
  name text not null,
  code text,
  description text,
  created_at timestamptz default now(),
  created_by uuid
);

create table if not exists public.company_areas (
  id uuid primary key,
  company_id uuid references public.companies(id),
  region_id uuid references public.company_regions(id),
  name text not null,
  code text,
  description text,
  created_at timestamptz default now(),
  created_by uuid
);

-- Profiles
create table if not exists public.profiles (
  id uuid primary key,
  auth_user_id uuid unique,
  company_id uuid references public.companies(id),
  app_role text default 'Staff',
  full_name text,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sites
create table if not exists public.sites (
  id uuid primary key,
  name text not null,
  company_id uuid references public.companies(id),
  region_id uuid references public.company_regions(id),
  area_id uuid references public.company_areas(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Site memberships junction
create table if not exists public.site_memberships (
  id uuid primary key,
  site_id uuid references public.sites(id),
  auth_user_id uuid
);

create table if not exists public.site_members (
  site_id uuid references public.sites(id),
  user_id uuid references public.profiles(id),
  is_fire_marshal boolean default false,
  is_first_aider boolean default false,
  primary key (site_id, user_id)
);

create table if not exists public.user_site_access (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  site_id uuid references public.sites(id),
  auth_user_id uuid,
  profile_id uuid references public.profiles(id),
  role text,
  created_at timestamptz default now(),
  created_by uuid
);

create table if not exists public.user_scope_assignments (
  id uuid primary key,
  company_id uuid references public.companies(id),
  scope_type text,
  scope_id uuid,
  auth_user_id uuid,
  profile_id uuid references public.profiles(id),
  role text,
  created_at timestamptz default now(),
  created_by uuid
);

create table if not exists public.site_profiles (
  id uuid primary key,
  company_id uuid references public.companies(id),
  site_id uuid references public.sites(id)
);

-- Task templates and tasks
create table if not exists public.task_templates (
  id uuid primary key,
  company_id uuid references public.companies(id),
  title text not null,
  category text,
  frequency text,
  days_of_week integer[] default '{}',
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.tasks (
  id uuid primary key,
  title text not null,
  company_id uuid references public.companies(id),
  site_id uuid references public.sites(id),
  status text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Temperature logs
create table if not exists public.temperature_logs (
  id uuid primary key,
  reading numeric not null,
  company_id uuid references public.companies(id),
  site_id uuid references public.sites(id),
  recorded_at timestamptz default now(),
  recorded_by uuid references public.profiles(id),
  status text,
  unit text,
  notes text,
  day_part text
);

create table if not exists public.temperature_breach_actions (
  id uuid primary key,
  company_id uuid references public.companies(id),
  site_id uuid references public.sites(id),
  created_at timestamptz default now(),
  created_by uuid references public.profiles(id),
  action text
);

-- Incidents
create table if not exists public.incidents (
  id uuid primary key,
  description text not null,
  incident_date timestamptz not null,
  site_id uuid references public.sites(id),
  user_id uuid references public.profiles(id)
);

-- Training records
create table if not exists public.training_records (
  id uuid primary key,
  user_id uuid references public.profiles(id),
  training_type text not null,
  completed_date timestamptz
);

-- Licences
create table if not exists public.licences (
  id uuid primary key,
  site_id uuid references public.sites(id),
  licence_type text not null,
  expiry_date timestamptz
);

-- Global documents
create table if not exists public.global_documents (
  id uuid primary key,
  company_id uuid references public.companies(id),
  title text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  file_url text
);

