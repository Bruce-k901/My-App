-- ============================================================================
-- Migration: 20250208113000_add_temperature_ingest_keys.sql
-- Description: Secrets table for temperature ingest HMAC authentication
-- ============================================================================

set check_function_bodies = off;

-- Ensure pgcrypto for gen_random_uuid if not already enabled
create extension if not exists "pgcrypto" with schema extensions;

-- Create temperature_ingest_keys table (only if companies table exists)
-- Note: Table creation will be skipped if companies table doesn't exist yet
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN
    -- Create table without foreign keys first
    CREATE TABLE IF NOT EXISTS public.temperature_ingest_keys (
      id uuid primary key default gen_random_uuid(),
      company_id uuid not null,
      label text not null,
      secret text not null,
      status text not null default 'active' check (status in ('active', 'revoked')),
      last_used_at timestamptz,
      rotated_at timestamptz,
      created_at timestamptz not null default now(),
      created_by uuid
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'temperature_ingest_keys_company_id_fkey') THEN
      ALTER TABLE public.temperature_ingest_keys ADD CONSTRAINT temperature_ingest_keys_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies (id) ON DELETE CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'temperature_ingest_keys_created_by_fkey') THEN
      ALTER TABLE public.temperature_ingest_keys ADD CONSTRAINT temperature_ingest_keys_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles (id);
    END IF;

    COMMENT ON TABLE public.temperature_ingest_keys IS
      'Per-tenant HMAC secrets for validating temperature ingest payloads.';

    COMMENT ON COLUMN public.temperature_ingest_keys.secret IS
      'Hex-encoded HMAC secret shared with IoT devices / partner systems.';

    CREATE INDEX IF NOT EXISTS temperature_ingest_keys_company_idx
      ON public.temperature_ingest_keys (company_id, status);

    ALTER TABLE public.temperature_ingest_keys ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS tenant_select_temperature_ingest_keys ON public.temperature_ingest_keys;
    CREATE POLICY tenant_select_temperature_ingest_keys
      ON public.temperature_ingest_keys
      FOR SELECT
      USING (
        public.is_service_role()
      );

    DROP POLICY IF EXISTS tenant_modify_temperature_ingest_keys ON public.temperature_ingest_keys;
    CREATE POLICY tenant_modify_temperature_ingest_keys
      ON public.temperature_ingest_keys
      FOR ALL
      USING (public.is_service_role())
      WITH CHECK (public.is_service_role());
  END IF;
END $$;

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

