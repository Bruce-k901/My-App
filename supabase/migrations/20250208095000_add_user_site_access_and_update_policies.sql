-- ============================================================================
-- Migration: 20250208095000_add_user_site_access_and_update_policies.sql
-- Description: Introduce user/site junction and tighten site-scoped RLS
-- ============================================================================

set check_function_bodies = off;

-------------------------------------------------------------------------------
-- User/site access junction
-- Note: Table creation will be skipped if required tables don't exist yet
-------------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'companies')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN
    -- Create table without foreign keys first
    CREATE TABLE IF NOT EXISTS public.user_site_access (
      id uuid primary key default gen_random_uuid(),
      company_id uuid not null,
      site_id uuid not null,
      auth_user_id uuid not null references auth.users (id) on delete cascade,
      profile_id uuid,
      role text default 'member',
      created_at timestamptz not null default now(),
      created_by uuid references auth.users (id),
      unique (auth_user_id, site_id)
    );

    -- Add foreign keys conditionally
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_site_access_company_id_fkey') THEN
      ALTER TABLE public.user_site_access ADD CONSTRAINT user_site_access_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies (id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_site_access_site_id_fkey') THEN
      ALTER TABLE public.user_site_access ADD CONSTRAINT user_site_access_site_id_fkey FOREIGN KEY (site_id) REFERENCES public.sites (id) ON DELETE CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'user_site_access_profile_id_fkey') THEN
      ALTER TABLE public.user_site_access ADD CONSTRAINT user_site_access_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles (id);
    END IF;

    COMMENT ON TABLE public.user_site_access IS 'Junction table granting users access to specific sites within a tenant.';
    COMMENT ON COLUMN public.user_site_access.role IS 'Optional role/label for the membership (e.g. member, manager).';

    CREATE INDEX IF NOT EXISTS user_site_access_auth_user_idx ON public.user_site_access (auth_user_id);
    CREATE INDEX IF NOT EXISTS user_site_access_site_idx ON public.user_site_access (site_id);
  END IF;
END $$;

-------------------------------------------------------------------------------
-- Backfill from existing sources (site memberships, profiles)
-- Note: Backfill will be skipped if source tables don't exist yet
-------------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_site_access')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'site_memberships')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN
    INSERT INTO public.user_site_access (
      company_id,
      site_id,
      auth_user_id,
      profile_id,
      role
    )
    SELECT DISTINCT
      s.company_id,
      sm.site_id,
      sm.auth_user_id,
      COALESCE(p.id, p2.id) as profile_id,
      'member'
    FROM public.site_memberships sm
    JOIN public.sites s ON s.id = sm.site_id
    LEFT JOIN public.profiles p ON p.auth_user_id = sm.auth_user_id
    LEFT JOIN public.profiles p2 ON p2.id = sm.auth_user_id
    JOIN auth.users au ON au.id = sm.auth_user_id
    WHERE sm.auth_user_id IS NOT NULL
    ON CONFLICT (auth_user_id, site_id) DO NOTHING;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_site_access')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'site_members')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    INSERT INTO public.user_site_access (
      company_id,
      site_id,
      auth_user_id,
      profile_id,
      role
    )
    SELECT DISTINCT
      s.company_id,
      sm.site_id,
      COALESCE(p.auth_user_id, p.id) as auth_user_id,
      p.id,
      'member'
    FROM public.site_members sm
    JOIN public.sites s ON s.id = sm.site_id
    JOIN public.profiles p ON p.id = sm.user_id
    JOIN auth.users au ON au.id = COALESCE(p.auth_user_id, p.id)
    WHERE COALESCE(p.auth_user_id, p.id) IS NOT NULL
    ON CONFLICT (auth_user_id, site_id) DO NOTHING;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_site_access')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN
    INSERT INTO public.user_site_access (
      company_id,
      site_id,
      auth_user_id,
      profile_id,
      role
    )
    SELECT DISTINCT
      s.company_id,
      s.id as site_id,
      COALESCE(p.auth_user_id, p.id) as auth_user_id,
      p.id,
      CASE
        WHEN lower(COALESCE(p.app_role::text, '')) IN ('owner', 'admin', 'area_manager', 'general_manager')
          THEN 'manager'
        ELSE 'member'
      END as role
    FROM public.profiles p
    JOIN public.sites s ON s.id = COALESCE(p.site_id, p.home_site)
    JOIN auth.users au ON au.id = COALESCE(p.auth_user_id, p.id)
    WHERE COALESCE(p.site_id, p.home_site) IS NOT NULL
      AND COALESCE(p.auth_user_id, p.id) IS NOT NULL
    ON CONFLICT (auth_user_id, site_id) DO NOTHING;

    INSERT INTO public.user_site_access (
      company_id,
      site_id,
      auth_user_id,
      profile_id,
      role
    )
    SELECT DISTINCT
      s.company_id,
      s.id as site_id,
      COALESCE(p.auth_user_id, p.id) as auth_user_id,
      p.id,
      'manager'
    FROM public.profiles p
    JOIN public.sites s ON s.company_id = p.company_id
    JOIN auth.users au ON au.id = COALESCE(p.auth_user_id, p.id)
    WHERE p.company_id IS NOT NULL
      AND COALESCE(p.auth_user_id, p.id) IS NOT NULL
      AND lower(COALESCE(p.app_role::text, '')) IN ('owner', 'admin', 'area_manager')
    ON CONFLICT (auth_user_id, site_id) DO NOTHING;
  END IF;
END $$;

-------------------------------------------------------------------------------
-- Helper function for site access checks
-------------------------------------------------------------------------------

create or replace function public.has_site_access(target_site uuid)
returns boolean
language sql
stable
as $$
  select
    target_site is null
    or public.is_service_role()
    or exists (
      select 1
      from public.user_site_access usa
      join public.sites s on s.id = usa.site_id
      where usa.auth_user_id = auth.uid()
        and usa.site_id = target_site
        and matches_current_tenant(s.company_id)
    )
    or exists (
      select 1
      from public.profiles p
      join public.sites s on s.id = target_site
      where matches_current_tenant(s.company_id)
        and matches_current_tenant(p.company_id)
        and (
          p.id = auth.uid()
          or p.auth_user_id = auth.uid()
        )
        and (
          p.site_id = target_site
          or p.home_site = target_site
        or lower(coalesce(p.app_role::text, '')) in ('owner', 'admin', 'area_manager', 'general_manager')
        )
    );
$$;

comment on function public.has_site_access(uuid)
  is 'Returns true when the current user has access to the supplied site within their tenant.';

-------------------------------------------------------------------------------
-- RLS for user_site_access
-- Note: RLS setup will be skipped if table doesn't exist yet
-------------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_site_access') THEN
    ALTER TABLE public.user_site_access ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS tenant_select_user_site_access ON public.user_site_access;
    CREATE POLICY tenant_select_user_site_access
      ON public.user_site_access
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
                AND lower(COALESCE(p.app_role::text, '')) IN ('owner', 'admin', 'area_manager', 'general_manager')
            )
          )
        )
      );

    DROP POLICY IF EXISTS tenant_modify_user_site_access ON public.user_site_access;
    CREATE POLICY tenant_modify_user_site_access
      ON public.user_site_access
      FOR ALL
      USING (
        public.is_service_role()
      )
      WITH CHECK (
        public.is_service_role()
      );
  END IF;
END $$;

-------------------------------------------------------------------------------
-- Refresh policies to use has_site_access helper
-- Note: Policy updates will be skipped if tables don't exist yet
-------------------------------------------------------------------------------

-- Sites ----------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sites') THEN
    DROP POLICY IF EXISTS tenant_select_sites ON public.sites;
    CREATE POLICY tenant_select_sites
      ON public.sites
      FOR SELECT
      USING (
        public.is_service_role()
        OR (
          matches_current_tenant(company_id)
          AND public.has_site_access(id)
        )
      );

    DROP POLICY IF EXISTS tenant_modify_sites ON public.sites;
    CREATE POLICY tenant_modify_sites
      ON public.sites
      FOR ALL
      USING (
        public.is_service_role()
        OR (
          matches_current_tenant(company_id)
          AND public.has_site_access(id)
        )
      )
      WITH CHECK (
        public.is_service_role()
        OR (
          matches_current_tenant(company_id)
          AND public.has_site_access(id)
        )
      );
  END IF;
END $$;

-- Site profiles --------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'site_profiles') THEN
    DROP POLICY IF EXISTS tenant_select_site_profiles ON public.site_profiles;
    CREATE POLICY tenant_select_site_profiles
      ON public.site_profiles
      FOR SELECT
      USING (
        public.is_service_role()
        OR (
          matches_current_tenant(company_id)
          AND public.has_site_access(site_id)
        )
      );

    DROP POLICY IF EXISTS tenant_modify_site_profiles ON public.site_profiles;
    CREATE POLICY tenant_modify_site_profiles
      ON public.site_profiles
      FOR ALL
      USING (
        public.is_service_role()
        OR (
          matches_current_tenant(company_id)
          AND public.has_site_access(site_id)
        )
      )
      WITH CHECK (
        public.is_service_role()
        OR (
          matches_current_tenant(company_id)
          AND public.has_site_access(site_id)
        )
      );
  END IF;
END $$;

-- Site memberships (auth_user junction) --------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'site_memberships') THEN
    DROP POLICY IF EXISTS tenant_select_site_memberships ON public.site_memberships;
    CREATE POLICY tenant_select_site_memberships
      ON public.site_memberships
      FOR SELECT
      USING (
        public.is_service_role()
        OR public.has_site_access(site_memberships.site_id)
      );

    DROP POLICY IF EXISTS tenant_modify_site_memberships ON public.site_memberships;
    CREATE POLICY tenant_modify_site_memberships
      ON public.site_memberships
      FOR ALL
      USING (
        public.is_service_role()
        OR public.has_site_access(site_memberships.site_id)
      )
      WITH CHECK (
        public.is_service_role()
        OR public.has_site_access(site_memberships.site_id)
      );
  END IF;
END $$;

-- Site members (profile junction) -------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'site_members') THEN
    DROP POLICY IF EXISTS tenant_select_site_members ON public.site_members;
    CREATE POLICY tenant_select_site_members
      ON public.site_members
      FOR SELECT
      USING (
        public.is_service_role()
        OR public.has_site_access(site_members.site_id)
      );

    DROP POLICY IF EXISTS tenant_modify_site_members ON public.site_members;
    CREATE POLICY tenant_modify_site_members
      ON public.site_members
      FOR ALL
      USING (
        public.is_service_role()
        OR public.has_site_access(site_members.site_id)
      )
      WITH CHECK (
        public.is_service_role()
        OR public.has_site_access(site_members.site_id)
      );
  END IF;
END $$;

-- Tasks ----------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    DROP POLICY IF EXISTS tenant_select_tasks ON public.tasks;
    CREATE POLICY tenant_select_tasks
      ON public.tasks
      FOR SELECT
      USING (
        public.is_service_role()
        OR (
          matches_current_tenant(company_id)
          AND (
            site_id IS NULL
            OR public.has_site_access(site_id)
          )
        )
      );

    DROP POLICY IF EXISTS tenant_modify_tasks ON public.tasks;
    CREATE POLICY tenant_modify_tasks
      ON public.tasks
      FOR ALL
      USING (
        public.is_service_role()
        OR (
          matches_current_tenant(company_id)
          AND (
            site_id IS NULL
            OR public.has_site_access(site_id)
          )
        )
      )
      WITH CHECK (
        public.is_service_role()
        OR (
          matches_current_tenant(company_id)
          AND (
            site_id IS NULL
            OR public.has_site_access(site_id)
          )
        )
      );
  END IF;
END $$;

-- Temperature logs -----------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'temperature_logs') THEN
    DROP POLICY IF EXISTS tenant_select_temperature_logs ON public.temperature_logs;
    CREATE POLICY tenant_select_temperature_logs
      ON public.temperature_logs
      FOR SELECT
      USING (
        public.is_service_role()
        OR (
          matches_current_tenant(company_id)
          AND public.has_site_access(site_id)
        )
      );

    DROP POLICY IF EXISTS tenant_modify_temperature_logs ON public.temperature_logs;
    CREATE POLICY tenant_modify_temperature_logs
      ON public.temperature_logs
      FOR ALL
      USING (
        public.is_service_role()
        OR (
          matches_current_tenant(company_id)
          AND public.has_site_access(site_id)
        )
      )
      WITH CHECK (
        public.is_service_role()
        OR (
          matches_current_tenant(company_id)
          AND public.has_site_access(site_id)
        )
      );
  END IF;
END $$;

-- Incidents ------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'incidents') THEN
    DROP POLICY IF EXISTS tenant_select_incidents ON public.incidents;
    CREATE POLICY tenant_select_incidents
      ON public.incidents
      FOR SELECT
      USING (
        public.is_service_role()
        OR public.has_site_access(incidents.site_id)
      );

    DROP POLICY IF EXISTS tenant_modify_incidents ON public.incidents;
    CREATE POLICY tenant_modify_incidents
      ON public.incidents
      FOR ALL
      USING (
        public.is_service_role()
        OR public.has_site_access(incidents.site_id)
      )
      WITH CHECK (
        public.is_service_role()
        OR public.has_site_access(incidents.site_id)
      );
  END IF;
END $$;

-- Licences -------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'licences') THEN
    DROP POLICY IF EXISTS tenant_select_licences ON public.licences;
    CREATE POLICY tenant_select_licences
      ON public.licences
      FOR SELECT
      USING (
        public.is_service_role()
        OR public.has_site_access(licences.site_id)
      );

    DROP POLICY IF EXISTS tenant_modify_licences ON public.licences;
    CREATE POLICY tenant_modify_licences
      ON public.licences
      FOR ALL
      USING (
        public.is_service_role()
        OR public.has_site_access(licences.site_id)
      )
      WITH CHECK (
        public.is_service_role()
        OR public.has_site_access(licences.site_id)
      );
  END IF;
END $$;

-- Temperature breach actions -------------------------------------------------
do $policy$
declare
  breach_table regclass := to_regclass('public.temperature_breach_actions');
begin
  if breach_table is not null then
    execute 'alter table public.temperature_breach_actions enable row level security';

    execute 'drop policy if exists tenant_select_temperature_breach_actions on public.temperature_breach_actions';
    execute '
      create policy tenant_select_temperature_breach_actions
        on public.temperature_breach_actions
        for select
        using (
          public.is_service_role()
          or (
            matches_current_tenant(company_id)
            and public.has_site_access(site_id)
          )
        )';

    execute 'drop policy if exists tenant_modify_temperature_breach_actions on public.temperature_breach_actions';
    execute '
      create policy tenant_modify_temperature_breach_actions
        on public.temperature_breach_actions
        for all
        using (
          public.is_service_role()
          or (
            matches_current_tenant(company_id)
            and public.has_site_access(site_id)
          )
        )
        with check (
          public.is_service_role()
          or (
            matches_current_tenant(company_id)
            and public.has_site_access(site_id)
          )
        )';
  end if;
end
$policy$;

-- End of migration -----------------------------------------------------------

