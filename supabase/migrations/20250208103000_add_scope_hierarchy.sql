-- ============================================================================
-- Migration: 20250208103000_add_scope_hierarchy.sql
-- Description: Region/area hierarchy and unified scope assignments
-- ============================================================================

set check_function_bodies = off;

-------------------------------------------------------------------------------
-- Hierarchy tables
-- Note: Table creation will be skipped if companies table doesn't exist yet
-------------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN
    -- Create company_regions table without foreign key first
    CREATE TABLE IF NOT EXISTS public.company_regions (
      id uuid primary key default gen_random_uuid(),
      company_id uuid not null,
      name text not null,
      code text,
      description text,
      created_at timestamptz not null default now(),
      created_by uuid references auth.users (id)
    );

    -- Add foreign key conditionally
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'company_regions_company_id_fkey') THEN
      ALTER TABLE public.company_regions ADD CONSTRAINT company_regions_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies (id) ON DELETE CASCADE;
    END IF;

    CREATE INDEX IF NOT EXISTS company_regions_company_idx ON public.company_regions (company_id, lower(name));

    -- Create company_areas table without foreign keys first
    CREATE TABLE IF NOT EXISTS public.company_areas (
      id uuid primary key default gen_random_uuid(),
      company_id uuid not null,
      region_id uuid,
      name text not null,
      code text,
      description text,
      created_at timestamptz not null default now(),
      created_by uuid references auth.users (id)
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'company_areas_company_id_fkey') THEN
      ALTER TABLE public.company_areas ADD CONSTRAINT company_areas_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies (id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'company_areas_region_id_fkey') THEN
      ALTER TABLE public.company_areas ADD CONSTRAINT company_areas_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.company_regions (id) ON DELETE SET NULL;
    END IF;

    CREATE INDEX IF NOT EXISTS company_areas_company_idx ON public.company_areas (company_id, lower(name));

    -- Add columns to sites table (only if sites table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN
      ALTER TABLE public.sites
        ADD COLUMN IF NOT EXISTS region_id uuid,
        ADD COLUMN IF NOT EXISTS area_id uuid;

      -- Add foreign keys conditionally
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sites_region_id_fkey') THEN
        ALTER TABLE public.sites ADD CONSTRAINT sites_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.company_regions (id) ON DELETE SET NULL;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sites_area_id_fkey') THEN
        ALTER TABLE public.sites ADD CONSTRAINT sites_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.company_areas (id) ON DELETE SET NULL;
      END IF;
    END IF;
  END IF;
END $$;

-------------------------------------------------------------------------------
-- Unified scope assignments
-- Note: Table creation will be skipped if companies table doesn't exist yet
-------------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies') THEN
    -- Create table without foreign keys first
    CREATE TABLE IF NOT EXISTS public.user_scope_assignments (
      id uuid primary key default gen_random_uuid(),
      company_id uuid not null,
      scope_type text not null check (scope_type in ('tenant', 'region', 'area', 'site')),
      scope_id uuid not null,
      auth_user_id uuid not null references auth.users (id) on delete cascade,
      profile_id uuid,
      role text default 'member',
      created_at timestamptz not null default now(),
      created_by uuid references auth.users (id),
      unique (auth_user_id, scope_type, scope_id)
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_scope_assignments_company_id_fkey') THEN
      ALTER TABLE public.user_scope_assignments ADD CONSTRAINT user_scope_assignments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies (id) ON DELETE CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_scope_assignments_profile_id_fkey') THEN
      ALTER TABLE public.user_scope_assignments ADD CONSTRAINT user_scope_assignments_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles (id);
    END IF;

    CREATE INDEX IF NOT EXISTS user_scope_assignments_company_idx ON public.user_scope_assignments (company_id, scope_type, scope_id);
    CREATE INDEX IF NOT EXISTS user_scope_assignments_user_idx ON public.user_scope_assignments (auth_user_id);
  END IF;
END $$;

-------------------------------------------------------------------------------
-- Backfill existing assignments
-- Note: Backfill will be skipped if source tables don't exist yet
-------------------------------------------------------------------------------

DO $$
BEGIN
  -- Backfill from user_site_access
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_scope_assignments')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_site_access') THEN
    INSERT INTO public.user_scope_assignments (
      company_id,
      scope_type,
      scope_id,
      auth_user_id,
      profile_id,
      role
    )
    SELECT DISTINCT
      usa.company_id,
      'site' as scope_type,
      usa.site_id as scope_id,
      usa.auth_user_id,
      usa.profile_id,
      COALESCE(NULLIF(usa.role, ''), 'member') as role
    FROM public.user_site_access usa
    WHERE usa.auth_user_id IS NOT NULL
      AND usa.site_id IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;

  -- Backfill from profiles
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_scope_assignments')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    INSERT INTO public.user_scope_assignments (
      company_id,
      scope_type,
      scope_id,
      auth_user_id,
      profile_id,
      role
    )
    SELECT DISTINCT
      p.company_id,
      'tenant' as scope_type,
      p.company_id as scope_id,
      COALESCE(p.auth_user_id, p.id) as auth_user_id,
      p.id as profile_id,
      lower(COALESCE(p.app_role::text, 'member')) as role
    FROM public.profiles p
    WHERE p.company_id IS NOT NULL
      AND COALESCE(p.auth_user_id, p.id) IS NOT NULL
      AND lower(COALESCE(p.app_role::text, '')) IN (
        'owner',
        'admin',
        'area_manager',
        'general_manager',
        'ops_director',
        'operations_director',
        'regional_manager'
      )
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-------------------------------------------------------------------------------
-- Helper function update
-------------------------------------------------------------------------------

create or replace function public.has_site_access(target_site uuid)
returns boolean
language sql
stable
as $$
  with site_ctx as (
    select
      s.id,
      s.company_id,
      s.region_id,
      s.area_id
    from public.sites s
    where s.id = target_site
      and matches_current_tenant(s.company_id)
  ),
  assignment_access as (
    select 1
    from site_ctx sc
    join public.user_scope_assignments usa
      on usa.company_id = sc.company_id
     and usa.auth_user_id = auth.uid()
     and (
       (usa.scope_type = 'tenant' and usa.scope_id = sc.company_id)
       or (usa.scope_type = 'region' and sc.region_id is not null and usa.scope_id = sc.region_id)
       or (usa.scope_type = 'area' and sc.area_id is not null and usa.scope_id = sc.area_id)
       or (usa.scope_type = 'site' and usa.scope_id = sc.id)
     )
    limit 1
  ),
  legacy_site as (
    select 1
    from public.user_site_access usa
    where usa.auth_user_id = auth.uid()
      and usa.site_id = target_site
    limit 1
  ),
  legacy_profile as (
    select 1
    from site_ctx sc
    join public.profiles p
      on matches_current_tenant(p.company_id)
     and (
       p.id = auth.uid()
       or p.auth_user_id = auth.uid()
     )
    where
      p.site_id = sc.id
      or p.home_site = sc.id
      or lower(coalesce(p.app_role::text, '')) in (
        'owner',
        'admin',
        'area_manager',
        'general_manager',
        'ops_director',
        'operations_director',
        'regional_manager'
      )
    limit 1
  )
  select
    target_site is null
    or public.is_service_role()
    or exists (select 1 from assignment_access)
    or exists (select 1 from legacy_site)
    or exists (select 1 from legacy_profile);
$$;

-------------------------------------------------------------------------------
-- RLS for user_scope_assignments (read-only to scoped managers)
-- Note: RLS setup will be skipped if table doesn't exist yet
-------------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_scope_assignments') THEN
    ALTER TABLE public.user_scope_assignments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS tenant_select_user_scope_assignments ON public.user_scope_assignments;
    CREATE POLICY tenant_select_user_scope_assignments
      ON public.user_scope_assignments
      FOR SELECT
      USING (
        public.is_service_role()
        OR (
          matches_current_tenant(company_id)
          AND (
            auth.uid() = auth_user_id
            OR EXISTS (
              SELECT 1
              FROM public.profiles p
              WHERE matches_current_tenant(p.company_id)
                AND (
                  p.id = auth.uid()
                  OR p.auth_user_id = auth.uid()
                )
                AND lower(COALESCE(p.app_role::text, '')) IN (
                  'owner',
                  'admin',
                  'area_manager',
                  'general_manager',
                  'ops_director',
                  'operations_director',
                  'regional_manager'
                )
            )
          )
        )
      );

    DROP POLICY IF EXISTS tenant_modify_user_scope_assignments ON public.user_scope_assignments;
    CREATE POLICY tenant_modify_user_scope_assignments
      ON public.user_scope_assignments
      FOR ALL
      USING (public.is_service_role())
      WITH CHECK (public.is_service_role());
  END IF;
END $$;

-- End of migration -----------------------------------------------------------

