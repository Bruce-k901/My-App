-- ============================================================================
-- Fix Security Issues - RLS and Security Definer Views
-- ============================================================================
-- This script fixes all security issues identified by Supabase linter
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: Enable RLS on Tables with Policies but RLS Disabled
-- ============================================================================

-- Enable RLS on assets table (has policies but RLS not enabled)
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Enable RLS on conversations table (has policies but RLS not enabled)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: Enable RLS on Public Tables Without RLS
-- ============================================================================

-- Enable RLS on contractors table
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contractors if they don't exist
DO $$
BEGIN
  -- Select policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'contractors' 
    AND policyname = 'contractors_select_company'
  ) THEN
    CREATE POLICY contractors_select_company
      ON public.contractors FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = contractors.company_id
        )
      );
  END IF;

  -- Insert policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'contractors' 
    AND policyname = 'contractors_insert_company'
  ) THEN
    CREATE POLICY contractors_insert_company
      ON public.contractors FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = contractors.company_id
            AND p.app_role IN ('Admin', 'Owner', 'Manager', 'General Manager')
        )
      );
  END IF;

  -- Update policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'contractors' 
    AND policyname = 'contractors_update_company'
  ) THEN
    CREATE POLICY contractors_update_company
      ON public.contractors FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = contractors.company_id
            AND p.app_role IN ('Admin', 'Owner', 'Manager', 'General Manager')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = contractors.company_id
            AND p.app_role IN ('Admin', 'Owner', 'Manager', 'General Manager')
        )
      );
  END IF;

  -- Delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'contractors' 
    AND policyname = 'contractors_delete_company'
  ) THEN
    CREATE POLICY contractors_delete_company
      ON public.contractors FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = contractors.company_id
            AND p.app_role IN ('Admin', 'Owner')
        )
      );
  END IF;
END $$;

-- Enable RLS on site_closures table
ALTER TABLE public.site_closures ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for site_closures if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'site_closures' 
    AND policyname = 'site_closures_select_company'
  ) THEN
    CREATE POLICY site_closures_select_company
      ON public.site_closures FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = (SELECT company_id FROM public.sites WHERE id = site_closures.site_id)
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'site_closures' 
    AND policyname = 'site_closures_insert_company'
  ) THEN
    CREATE POLICY site_closures_insert_company
      ON public.site_closures FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = (SELECT company_id FROM public.sites WHERE id = site_closures.site_id)
            AND p.app_role IN ('Admin', 'Owner', 'Manager', 'General Manager')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'site_closures' 
    AND policyname = 'site_closures_update_company'
  ) THEN
    CREATE POLICY site_closures_update_company
      ON public.site_closures FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = (SELECT company_id FROM public.sites WHERE id = site_closures.site_id)
            AND p.app_role IN ('Admin', 'Owner', 'Manager', 'General Manager')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = (SELECT company_id FROM public.sites WHERE id = site_closures.site_id)
            AND p.app_role IN ('Admin', 'Owner', 'Manager', 'General Manager')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'site_closures' 
    AND policyname = 'site_closures_delete_company'
  ) THEN
    CREATE POLICY site_closures_delete_company
      ON public.site_closures FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = (SELECT company_id FROM public.sites WHERE id = site_closures.site_id)
            AND p.app_role IN ('Admin', 'Owner')
        )
      );
  END IF;
END $$;

-- Enable RLS on archived_users table
ALTER TABLE public.archived_users ENABLE ROW LEVEL SECURITY;

-- Policies should already exist from archived_users.sql migration
-- Verify they exist, if not create them
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'archived_users' 
    AND policyname = 'archived_users_select_company'
  ) THEN
    CREATE POLICY archived_users_select_company
      ON public.archived_users FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = archived_users.company_id
        )
      );
  END IF;
END $$;

-- Enable RLS on troubleshooting_questions table
-- Note: This table appears to be a global reference table (no company_id column)
-- It's filtered by category and is_active, so we'll allow authenticated users to read it
ALTER TABLE public.troubleshooting_questions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for troubleshooting_questions
-- Since it's a global reference table, allow authenticated users to read it
-- Only admins/managers can insert/update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'troubleshooting_questions' 
    AND policyname = 'troubleshooting_questions_select_authenticated'
  ) THEN
    CREATE POLICY troubleshooting_questions_select_authenticated
      ON public.troubleshooting_questions FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'troubleshooting_questions' 
    AND policyname = 'troubleshooting_questions_insert_admin'
  ) THEN
    CREATE POLICY troubleshooting_questions_insert_admin
      ON public.troubleshooting_questions FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.app_role IN ('Admin', 'Owner')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'troubleshooting_questions' 
    AND policyname = 'troubleshooting_questions_update_admin'
  ) THEN
    CREATE POLICY troubleshooting_questions_update_admin
      ON public.troubleshooting_questions FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.app_role IN ('Admin', 'Owner')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.app_role IN ('Admin', 'Owner')
        )
      );
  END IF;
END $$;

-- ============================================================================
-- PART 3: Check Legacy Tables - May Need to Drop or Enable RLS
-- ============================================================================

-- Check if ppm_schedule_redundant is used (appears to be legacy)
-- Only in types file, not in actual code - consider dropping
-- For now, enable RLS to fix security issue
ALTER TABLE IF EXISTS public.ppm_schedule_redundant ENABLE ROW LEVEL SECURITY;

-- Check if user_scope_assignments is used (not found in codebase)
-- Enable RLS if table exists
ALTER TABLE IF EXISTS public.user_scope_assignments ENABLE ROW LEVEL SECURITY;

-- Check if company_regions is used (not found in codebase)
-- Enable RLS if table exists
ALTER TABLE IF EXISTS public.company_regions ENABLE ROW LEVEL SECURITY;

-- Check if company_areas is used (not found in codebase)
-- Enable RLS if table exists
ALTER TABLE IF EXISTS public.company_areas ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 4: Fix Security Definer Views
-- ============================================================================

-- Note: Views with SECURITY DEFINER need to be recreated manually
-- Run this query first to get view definitions:
-- SELECT 
--   table_name, 
--   view_definition 
-- FROM information_schema.views 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('ppm_schedule', 'profile_settings', 'site_compliance_score_latest', 'ppm_full_schedule', 'v_current_profile', 'tenant_compliance_overview', 'v_user_sites');

-- Then for each view:
-- 1. DROP VIEW IF EXISTS public.view_name CASCADE;
-- 2. CREATE VIEW public.view_name AS <definition without SECURITY DEFINER>;

-- Example for site_compliance_score_latest (already has security_barrier, just need to ensure no SECURITY DEFINER):
DROP VIEW IF EXISTS public.site_compliance_score_latest CASCADE;
CREATE VIEW public.site_compliance_score_latest
WITH (security_barrier = true)
AS
  SELECT DISTINCT ON (scs.site_id)
    scs.id,
    scs.site_id,
    scs.tenant_id,
    scs.score_date,
    scs.score,
    scs.open_critical_incidents,
    scs.overdue_corrective_actions,
    scs.missed_daily_checklists,
    scs.temperature_breaches_last_7d,
    scs.breakdown,
    scs.created_at
  FROM public.site_compliance_score scs
  ORDER BY scs.site_id, scs.score_date DESC, scs.created_at DESC;

-- Example for tenant_compliance_overview:
DROP VIEW IF EXISTS public.tenant_compliance_overview CASCADE;
CREATE VIEW public.tenant_compliance_overview
WITH (security_barrier = true)
AS
  SELECT
    scs.tenant_id,
    MIN(scs.score_date) FILTER (WHERE scs.score_date >= CURRENT_DATE - INTERVAL '30 day') AS first_score_date,
    MAX(scs.score_date) AS latest_score_date,
    AVG(scs.score) AS average_score,
    MIN(scs.score) AS lowest_score,
    MAX(scs.score) AS highest_score,
    SUM(scs.open_critical_incidents) FILTER (WHERE scs.score_date = CURRENT_DATE) AS open_critical_incidents_today,
    SUM(scs.overdue_corrective_actions) FILTER (WHERE scs.score_date = CURRENT_DATE) AS overdue_corrective_actions_today,
    COUNT(DISTINCT scs.site_id) AS site_count
  FROM public.site_compliance_score scs
  GROUP BY scs.tenant_id;

-- For other views (ppm_schedule, profile_settings, ppm_full_schedule, v_current_profile, v_user_sites):
-- You need to query the database first to get their definitions, then recreate them
-- See FIX_SECURITY_DEFINER_VIEWS.sql for a helper script

-- ============================================================================
-- PART 5: Fix RLS Policies Using user_metadata
-- ============================================================================

-- Find and fix policies that use user_metadata
-- These need to be replaced with proper company_id checks from profiles table

-- Drop problematic policies on profiles table
DROP POLICY IF EXISTS "profiles: select by company (jwt+user_metadata)" ON public.profiles;
DROP POLICY IF EXISTS "profiles: update by admins/managers (jwt+user_metadata)" ON public.profiles;
DROP POLICY IF EXISTS "profiles: self-update (jwt+user_metadata)" ON public.profiles;

-- Drop problematic policy on sites table
DROP POLICY IF EXISTS "sites: select by company (jwt+user_metadata)" ON public.sites;

-- Recreate policies using proper company_id from profiles table
-- These should already exist, but we're ensuring they're correct

-- Profiles select policy (should use company_id from profiles table)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'profiles_select_company'
  ) THEN
    CREATE POLICY profiles_select_company
      ON public.profiles FOR SELECT
      USING (
        company_id IN (
          SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
        OR id = auth.uid()
      );
  END IF;
END $$;

-- Profiles update policy for admins/managers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'profiles_update_admins_managers'
  ) THEN
    CREATE POLICY profiles_update_admins_managers
      ON public.profiles FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = profiles.company_id
            AND p.app_role IN ('Admin', 'Owner', 'Manager', 'General Manager')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.company_id = profiles.company_id
            AND p.app_role IN ('Admin', 'Owner', 'Manager', 'General Manager')
        )
      );
  END IF;
END $$;

-- Profiles self-update policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'profiles_self_update'
  ) THEN
    CREATE POLICY profiles_self_update
      ON public.profiles FOR UPDATE
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- Sites select policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'sites' 
    AND policyname = 'sites_select_company'
  ) THEN
    CREATE POLICY sites_select_company
      ON public.sites FOR SELECT
      USING (
        company_id IN (
          SELECT company_id FROM public.profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check RLS is enabled on all tables
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('assets', 'conversations', 'contractors', 'site_closures', 'archived_users', 'troubleshooting_questions')
-- ORDER BY tablename;

-- Check policies exist
-- SELECT tablename, policyname 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('assets', 'conversations', 'contractors', 'site_closures', 'archived_users', 'troubleshooting_questions')
-- ORDER BY tablename, policyname;

-- Check views for SECURITY DEFINER
-- SELECT table_name, view_definition 
-- FROM information_schema.views 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('ppm_schedule', 'profile_settings', 'site_compliance_score_latest', 'ppm_full_schedule', 'v_current_profile', 'tenant_compliance_overview', 'v_user_sites');

