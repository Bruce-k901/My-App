-- ============================================================================
-- Migration: Emergency Contacts Table
-- Description: Stores emergency contact information for display on notice boards
-- ============================================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    -- Create emergency_contacts table
    CREATE TABLE IF NOT EXISTS public.emergency_contacts (
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
    CREATE INDEX IF NOT EXISTS idx_emergency_contacts_company_id ON public.emergency_contacts(company_id);
    CREATE INDEX IF NOT EXISTS idx_emergency_contacts_site_id ON public.emergency_contacts(site_id);
    CREATE INDEX IF NOT EXISTS idx_emergency_contacts_active ON public.emergency_contacts(company_id, site_id, is_active) WHERE is_active = true;

    -- Enable RLS
    ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

    -- RLS Policies
    DROP POLICY IF EXISTS emergency_contacts_select ON public.emergency_contacts;
    CREATE POLICY emergency_contacts_select ON public.emergency_contacts
  for select using (
    company_id in (
      select company_id from public.profiles where id = auth.uid()
    )
  );

    DROP POLICY IF EXISTS emergency_contacts_insert ON public.emergency_contacts;
    CREATE POLICY emergency_contacts_insert ON public.emergency_contacts
  for insert with check (
    company_id in (
      select company_id from public.profiles 
      where id = auth.uid() 
        and app_role in ('Owner', 'Admin', 'Manager')
    )
  );

    DROP POLICY IF EXISTS emergency_contacts_update ON public.emergency_contacts;
    CREATE POLICY emergency_contacts_update ON public.emergency_contacts
  for update using (
    company_id in (
      select company_id from public.profiles 
      where id = auth.uid() 
        and app_role in ('Owner', 'Admin', 'Manager')
    )
  );

    DROP POLICY IF EXISTS emergency_contacts_delete ON public.emergency_contacts;
    CREATE POLICY emergency_contacts_delete ON public.emergency_contacts
  for delete using (
    company_id in (
      select company_id from public.profiles 
      where id = auth.uid() 
        and app_role in ('Owner', 'Admin', 'Manager')
    )
  );

    -- Create updated_at trigger
    CREATE OR REPLACE FUNCTION update_emergency_contacts_updated_at()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = now();
      NEW.updated_by = auth.uid();
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS update_emergency_contacts_timestamp ON public.emergency_contacts;
    CREATE TRIGGER update_emergency_contacts_timestamp
      BEFORE UPDATE ON public.emergency_contacts
      FOR EACH ROW
      EXECUTE FUNCTION update_emergency_contacts_updated_at();

    RAISE NOTICE 'Created emergency_contacts table with RLS policies';

  ELSE
    RAISE NOTICE '⚠️ Required tables (companies, sites, profiles) do not exist yet - skipping emergency_contacts';
  END IF;
END $$;

