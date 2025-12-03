-- ============================================================================
-- AUTHORITATIVE RLS POLICIES
-- ============================================================================
-- This is the SINGLE SOURCE OF TRUTH for all RLS policies.
-- 
-- IMPORTANT RULES:
-- 1. NEVER create a new RLS fix file - always update this file
-- 2. ALWAYS test policies after changes
-- 3. ALWAYS document why each policy exists
-- 4. Run this file to reset all policies to known good state
--
-- Usage:
--   psql -f supabase/sql/rls_policies_authoritative.sql
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING POLICIES (Clean Slate)
-- ============================================================================
-- This ensures we start from a known state

DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on critical tables
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
            AND tablename IN (
                'profiles', 
                'companies', 
                'sites', 
                'assets', 
                'contractors', 
                'tasks', 
                'incidents', 
                'temperature_logs',
                'site_daily_tasks',
                'task_templates',
                'notifications'
            )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: ENABLE RLS ON ALL TABLES (Only if tables exist)
-- ============================================================================

DO $$ 
DECLARE
    tbl_name TEXT;
    tables_to_check TEXT[] := ARRAY[
        'profiles', 
        'companies', 
        'sites', 
        'assets', 
        'contractors', 
        'tasks', 
        'incidents', 
        'temperature_logs',
        'site_daily_tasks',
        'task_templates',
        'notifications'
    ];
BEGIN
    FOREACH tbl_name IN ARRAY tables_to_check
    LOOP
        -- Check if table exists before enabling RLS
        IF EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = tbl_name
        ) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl_name);
            RAISE NOTICE 'RLS enabled on: %', tbl_name;
        ELSE
            RAISE NOTICE 'Table does not exist, skipping: %', tbl_name;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 3: PROFILES POLICIES (Foundation Layer)
-- ============================================================================
-- Profiles are the foundation - all other access flows through profiles.company_id
-- CRITICAL: Use security definer function to avoid infinite recursion
-- The function can check company_id without triggering RLS on profiles

-- First, create helper functions that bypass RLS to avoid infinite recursion

-- Get user's company_id
-- CRITICAL: Must use SET search_path and bypass RLS completely
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result UUID;
BEGIN
  -- Direct query bypassing RLS by using SECURITY DEFINER
  SELECT company_id INTO result
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN result;
END;
$$;

-- Check if user has admin/manager/owner role
-- CRITICAL: Must use SET search_path and bypass RLS completely
CREATE OR REPLACE FUNCTION public.is_user_admin_or_manager()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result BOOLEAN;
BEGIN
  -- Direct query bypassing RLS by using SECURITY DEFINER
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND LOWER(app_role::text) IN ('owner', 'admin', 'manager')
  ) INTO result;
  
  RETURN COALESCE(result, false);
END;
$$;

-- Users can access their own profile AND profiles in their company
-- This allows managers/admins to view and manage team members

CREATE POLICY profiles_select_own
  ON public.profiles
  FOR SELECT
  USING (
    -- User can see their own profile
    id = auth.uid()
    -- OR user can see profiles in their company (for team management)
    -- Use the security definer function to avoid infinite recursion
    OR company_id = public.get_user_company_id()
  );

CREATE POLICY profiles_insert_own
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    -- User can insert their own profile
    id = auth.uid()
    -- OR admins/managers can create profiles for their company
    -- Use security definer functions to avoid recursion
    OR (
      company_id = public.get_user_company_id()
      AND public.is_user_admin_or_manager()
    )
  );

CREATE POLICY profiles_update_own
  ON public.profiles
  FOR UPDATE
  USING (
    -- User can update their own profile
    id = auth.uid()
    -- OR admins/managers can update profiles in their company
    -- Use security definer functions to avoid recursion
    OR (
      company_id = public.get_user_company_id()
      AND public.is_user_admin_or_manager()
    )
  )
  WITH CHECK (
    -- User can update their own profile
    id = auth.uid()
    -- OR admins/managers can update profiles in their company
    -- Use security definer functions to avoid recursion
    OR (
      company_id = public.get_user_company_id()
      AND public.is_user_admin_or_manager()
    )
  );

-- ============================================================================
-- STEP 4: COMPANIES POLICIES (Critical - Handles Onboarding)
-- ============================================================================
-- Companies need special handling for onboarding:
-- 1. During signup: User creates company before profile exists
-- 2. After onboarding: User accesses via profile.company_id
-- 
-- Solution: Allow access if:
--   - company.user_id = auth.uid() (user owns the company)
--   - company.created_by = auth.uid() (user created it during signup)
--   - OR user has profile linked to company (normal operation)

-- SELECT: Users can read their own company or companies they're linked to
CREATE POLICY companies_select_own_or_profile
  ON public.companies
  FOR SELECT
  USING (
    -- User owns the company (set during creation)
    public.companies.user_id = auth.uid()
    -- OR user created it (during signup before profile exists)
    OR public.companies.created_by = auth.uid()
    -- OR user has profile linked to company (normal operation)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = public.companies.id
    )
  );

-- INSERT: Users can create companies for themselves
CREATE POLICY companies_insert_own
  ON public.companies
  FOR INSERT
  WITH CHECK (
    -- User must set themselves as owner
    public.companies.user_id = auth.uid()
    OR public.companies.created_by = auth.uid()
  );

-- UPDATE: Users can update their own company or companies they're linked to
CREATE POLICY companies_update_own_or_profile
  ON public.companies
  FOR UPDATE
  USING (
    public.companies.user_id = auth.uid()
    OR public.companies.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = public.companies.id
        AND LOWER(p.app_role::text) IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    public.companies.user_id = auth.uid()
    OR public.companies.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = public.companies.id
        AND LOWER(p.app_role::text) IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- STEP 5: SITES POLICIES (Depends on Companies)
-- ============================================================================
-- Sites belong to companies, so access flows through profile.company_id

CREATE POLICY sites_select_company
  ON public.sites
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = sites.company_id
    )
  );

CREATE POLICY sites_insert_company
  ON public.sites
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = sites.company_id
        AND LOWER(p.app_role::text) IN ('owner', 'admin')
    )
  );

CREATE POLICY sites_update_company
  ON public.sites
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = sites.company_id
        AND LOWER(p.app_role::text) IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = sites.company_id
        AND LOWER(p.app_role::text) IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- STEP 6: ASSETS POLICIES (Depends on Companies)
-- ============================================================================

CREATE POLICY assets_select_company
  ON public.assets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = assets.company_id
    )
  );

CREATE POLICY assets_insert_company
  ON public.assets
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = assets.company_id
        AND LOWER(p.app_role::text) IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY assets_update_company
  ON public.assets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = assets.company_id
        AND LOWER(p.app_role::text) IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = assets.company_id
        AND LOWER(p.app_role::text) IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY assets_delete_company
  ON public.assets
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = assets.company_id
        AND LOWER(p.app_role::text) IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- STEP 7: CONTRACTORS POLICIES (Depends on Companies)
-- ============================================================================

CREATE POLICY contractors_select_company
  ON public.contractors
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = contractors.company_id
    )
  );

CREATE POLICY contractors_insert_company
  ON public.contractors
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = contractors.company_id
        AND LOWER(p.app_role::text) IN ('owner', 'admin', 'manager')
    )
  );

CREATE POLICY contractors_update_company
  ON public.contractors
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = contractors.company_id
        AND LOWER(p.app_role::text) IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = contractors.company_id
        AND LOWER(p.app_role::text) IN ('owner', 'admin', 'manager')
    )
  );

-- ============================================================================
-- STEP 8: TASKS POLICIES (Depends on Companies)
-- ============================================================================

CREATE POLICY tasks_select_company
  ON public.tasks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = tasks.company_id
    )
  );

CREATE POLICY tasks_insert_company
  ON public.tasks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = tasks.company_id
    )
  );

CREATE POLICY tasks_update_company
  ON public.tasks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = tasks.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = tasks.company_id
    )
  );

-- ============================================================================
-- STEP 9: INCIDENTS POLICIES (Depends on Companies)
-- ============================================================================

CREATE POLICY incidents_select_company
  ON public.incidents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = incidents.company_id
    )
  );

CREATE POLICY incidents_insert_company
  ON public.incidents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = incidents.company_id
    )
  );

CREATE POLICY incidents_update_company
  ON public.incidents
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = incidents.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = incidents.company_id
    )
  );

-- ============================================================================
-- STEP 10: TEMPERATURE LOGS POLICIES (Depends on Companies)
-- ============================================================================

CREATE POLICY temperature_logs_select_company
  ON public.temperature_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = temperature_logs.company_id
    )
  );

CREATE POLICY temperature_logs_insert_company
  ON public.temperature_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = temperature_logs.company_id
    )
  );

-- ============================================================================
-- STEP 11: SITE DAILY TASKS POLICIES (Depends on Companies)
-- ============================================================================
-- Only create if table exists

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'site_daily_tasks'
    ) THEN
        CREATE POLICY site_daily_tasks_select_company
          ON public.site_daily_tasks
          FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND p.company_id = site_daily_tasks.company_id
            )
          );

        CREATE POLICY site_daily_tasks_insert_company
          ON public.site_daily_tasks
          FOR INSERT
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND p.company_id = site_daily_tasks.company_id
            )
          );

        CREATE POLICY site_daily_tasks_update_company
          ON public.site_daily_tasks
          FOR UPDATE
          USING (
            EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND p.company_id = site_daily_tasks.company_id
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND p.company_id = site_daily_tasks.company_id
            )
          );
        RAISE NOTICE 'Policies created for site_daily_tasks';
    ELSE
        RAISE NOTICE 'Table site_daily_tasks does not exist, skipping policies';
    END IF;
END $$;

-- ============================================================================
-- STEP 12: TASK TEMPLATES POLICIES (Depends on Companies)
-- ============================================================================
-- Only create if table exists

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'task_templates'
    ) THEN
        -- Drop existing policy if it exists
        DROP POLICY IF EXISTS task_templates_select_company ON public.task_templates;
        
        CREATE POLICY task_templates_select_company
          ON public.task_templates
          FOR SELECT
          USING (
            -- Global templates (company_id IS NULL) are visible to all authenticated users
            task_templates.company_id IS NULL OR
            -- Company-specific templates are visible to users from that company
            EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND p.company_id = task_templates.company_id
            )
          );

        CREATE POLICY task_templates_insert_company
          ON public.task_templates
          FOR INSERT
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND p.company_id = task_templates.company_id
                AND LOWER(p.app_role::text) IN ('owner', 'admin', 'manager')
            )
          );

        CREATE POLICY task_templates_update_company
          ON public.task_templates
          FOR UPDATE
          USING (
            EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND p.company_id = task_templates.company_id
                AND LOWER(p.app_role::text) IN ('owner', 'admin', 'manager')
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND p.company_id = task_templates.company_id
                AND LOWER(p.app_role::text) IN ('owner', 'admin', 'manager')
            )
          );
        RAISE NOTICE 'Policies created for task_templates';
    ELSE
        RAISE NOTICE 'Table task_templates does not exist, skipping policies';
    END IF;
END $$;

-- ============================================================================
-- STEP 13: NOTIFICATIONS POLICIES (User-specific)
-- ============================================================================
-- Only create if table exists

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
    ) THEN
        CREATE POLICY notifications_select_own
          ON public.notifications
          FOR SELECT
          USING (user_id = auth.uid());

        CREATE POLICY notifications_insert_own
          ON public.notifications
          FOR INSERT
          WITH CHECK (user_id = auth.uid());

        CREATE POLICY notifications_update_own
          ON public.notifications
          FOR UPDATE
          USING (user_id = auth.uid())
          WITH CHECK (user_id = auth.uid());
        RAISE NOTICE 'Policies created for notifications';
    ELSE
        RAISE NOTICE 'Table notifications does not exist, skipping policies';
    END IF;
END $$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
-- These indexes help RLS policies perform better

CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_created_by ON public.companies(created_by);
CREATE INDEX IF NOT EXISTS idx_sites_company_id ON public.sites(company_id);
CREATE INDEX IF NOT EXISTS idx_assets_company_id ON public.assets(company_id);
CREATE INDEX IF NOT EXISTS idx_contractors_company_id ON public.contractors(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON public.tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_incidents_company_id ON public.incidents(company_id);
CREATE INDEX IF NOT EXISTS idx_temperature_logs_company_id ON public.temperature_logs(company_id);
-- Index for site_daily_tasks (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'site_daily_tasks'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_site_daily_tasks_company_id ON public.site_daily_tasks(company_id);
    END IF;
END $$;
-- Index for task_templates (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'task_templates'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_task_templates_company_id ON public.task_templates(company_id);
    END IF;
END $$;
-- Index for notifications (only if table exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'notifications'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after applying policies to verify they're correct

-- Check that RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'profiles', 'companies', 'sites', 'assets', 
        'contractors', 'tasks', 'incidents', 'temperature_logs',
        'site_daily_tasks', 'task_templates', 'notifications'
    )
ORDER BY tablename;

-- Check that policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as command
FROM pg_policies 
WHERE schemaname = 'public'
    AND tablename IN (
        'profiles', 'companies', 'sites', 'assets', 
        'contractors', 'tasks', 'incidents', 'temperature_logs',
        'site_daily_tasks', 'task_templates', 'notifications'
    )
ORDER BY tablename, policyname;

