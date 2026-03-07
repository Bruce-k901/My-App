-- Profile-level notification and digest preferences
-- First, check if profile_settings exists as a VIEW and drop it if so
-- (Views cannot have triggers, RLS, or indexes - we need a table)

DO $$
BEGIN
  -- Drop view if it exists (views cannot be converted to tables)
  IF EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_schema = 'public' 
    AND table_name = 'profile_settings'
  ) THEN
    DROP VIEW IF EXISTS public.profile_settings CASCADE;
    RAISE NOTICE 'Dropped existing profile_settings VIEW';
  END IF;
END $$;

-- Create the table (will not error if it already exists as a table)
CREATE TABLE IF NOT EXISTS public.profile_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  site_id uuid null references public.sites(id) on delete set null,
  receive_email_digests boolean not null default true,
  include_incidents boolean not null default true,
  include_tasks boolean not null default true,
  notify_temperature_warnings boolean not null default true,
  sound_vibration boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Keep updated_at in sync
create or replace function public.profile_settings_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;$$;

drop trigger if exists trg_profile_settings_updated on public.profile_settings;
create trigger trg_profile_settings_updated
before update on public.profile_settings
for each row execute function public.profile_settings_set_updated_at();

alter table public.profile_settings enable row level security;

-- Users can view and manage their own settings
drop policy if exists profile_settings_select_own on public.profile_settings;
create policy profile_settings_select_own
  on public.profile_settings for select
  using (auth.uid() = user_id);

drop policy if exists profile_settings_insert_own on public.profile_settings;
create policy profile_settings_insert_own
  on public.profile_settings for insert
  with check (auth.uid() = user_id);

drop policy if exists profile_settings_update_own on public.profile_settings;
create policy profile_settings_update_own
  on public.profile_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Company isolation: admins/managers can read within company (optional)
drop policy if exists profile_settings_select_company on public.profile_settings;
create policy profile_settings_select_company
  on public.profile_settings for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.company_id = profile_settings.company_id
        and p.app_role in ('Admin', 'Owner', 'Manager')
    )
  );

create index if not exists idx_profile_settings_company on public.profile_settings(company_id);
create index if not exists idx_profile_settings_site on public.profile_settings(site_id);