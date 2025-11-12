-- ============================================================================
-- Migration: 20250208113000_add_temperature_ingest_keys.sql
-- Description: Secrets table for temperature ingest HMAC authentication
-- ============================================================================

set check_function_bodies = off;

-- Ensure pgcrypto for gen_random_uuid if not already enabled
create extension if not exists "pgcrypto" with schema extensions;

create table if not exists public.temperature_ingest_keys (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  label text not null,
  secret text not null,
  status text not null default 'active' check (status in ('active', 'revoked')),
  last_used_at timestamptz,
  rotated_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id)
);

comment on table public.temperature_ingest_keys is
  'Per-tenant HMAC secrets for validating temperature ingest payloads.';

comment on column public.temperature_ingest_keys.secret is
  'Hex-encoded HMAC secret shared with IoT devices / partner systems.';

create index if not exists temperature_ingest_keys_company_idx
  on public.temperature_ingest_keys (company_id, status);

alter table public.temperature_ingest_keys enable row level security;

drop policy if exists tenant_select_temperature_ingest_keys on public.temperature_ingest_keys;
create policy tenant_select_temperature_ingest_keys
  on public.temperature_ingest_keys
  for select
  using (
    public.is_service_role()
  );

drop policy if exists tenant_modify_temperature_ingest_keys on public.temperature_ingest_keys;
create policy tenant_modify_temperature_ingest_keys
  on public.temperature_ingest_keys
  for all
  using (public.is_service_role())
  with check (public.is_service_role());

-- Optional helper for generating secrets from SQL (hex random 32 bytes)
drop function if exists public.generate_ingest_secret();
create or replace function public.generate_ingest_secret()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  raw bytea := extensions.gen_random_bytes(32);
begin
  return encode(raw, 'hex');
end;
$$;

revoke execute on function public.generate_ingest_secret() from public, anon, authenticated;

-- End of migration -----------------------------------------------------------

