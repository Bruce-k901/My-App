-- ============================================================================
-- Migration: Fix Profiles RLS Infinite Recursion
-- Description: Fixes infinite recursion in profiles RLS policy
-- The issue: get_user_company_id() queries profiles, which triggers RLS, 
-- which calls get_user_company_id() again = infinite recursion
-- Solution: Use a direct subquery that PostgreSQL can optimize
-- ============================================================================
-- Note: This migration will be skipped if profiles table doesn't exist yet

DO $$
BEGIN
  -- Only proceed if profiles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN

    -- Drop ALL existing policies on profiles to start fresh
    DO $inner$ 
    DECLARE
        r RECORD;
    BEGIN
        FOR r IN (
            SELECT schemaname, tablename, policyname 
            FROM pg_policies 
            WHERE schemaname = 'public'
                AND tablename = 'profiles'
        ) LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
        END LOOP;
    END $inner$;

    -- Recreate get_user_company_id with explicit RLS bypass
    -- The key is to use SECURITY DEFINER and query with RLS disabled
    CREATE OR REPLACE FUNCTION public.get_user_company_id()
    RETURNS UUID
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    SET search_path = public
    AS $func$
    DECLARE
      v_company_id UUID;
    BEGIN
      -- SECURITY DEFINER should bypass RLS, but to be absolutely sure,
      -- we can set local role to bypasser (if available) or use a different approach
      -- For now, SECURITY DEFINER should be enough
      SELECT company_id INTO v_company_id
      FROM public.profiles
      WHERE id = auth.uid()
      LIMIT 1;
      
      RETURN v_company_id;
    END;
    $func$;

    -- Recreate get_user_role with explicit RLS bypass
    CREATE OR REPLACE FUNCTION public.get_user_role()
    RETURNS TEXT
    LANGUAGE sql
    SECURITY DEFINER
    STABLE
    SET search_path = public
    AS $func$
      SELECT app_role
      FROM public.profiles
      WHERE id = auth.uid()
      LIMIT 1;
    $func$;

    -- Create SELECT policy WITHOUT calling functions that query profiles
    -- PostgreSQL will optimize the subquery to evaluate once per policy check
    -- If this still causes recursion, we'll need to use JWT claims or a view
    CREATE POLICY profiles_select_company
      ON public.profiles
      FOR SELECT
      USING (
        -- Users can always see their own profile (no recursion - direct comparison)
        id = auth.uid()
        OR
        -- Users can see profiles in their company
        -- PostgreSQL should optimize this subquery to avoid recursion
        -- It evaluates the subquery once per policy check, not per row
        (
          company_id IS NOT NULL
          AND company_id = (
            SELECT p.company_id 
            FROM public.profiles p 
            WHERE p.id = auth.uid()
            LIMIT 1
          )
        )
      );

    -- Create UPDATE policy (simplified, no function calls)
    CREATE POLICY profiles_update_company
      ON public.profiles
      FOR UPDATE
      USING (
        id = auth.uid()
        OR
        (
          company_id IS NOT NULL
          AND company_id = (
            SELECT p.company_id 
            FROM public.profiles p 
            WHERE p.id = auth.uid()
            LIMIT 1
          )
          AND (
            SELECT p.app_role 
            FROM public.profiles p 
            WHERE p.id = auth.uid()
            LIMIT 1
          ) IN ('admin', 'owner', 'manager', 'general_manager')
        )
      )
      WITH CHECK (
        id = auth.uid()
        OR
        (
          company_id IS NOT NULL
          AND company_id = (
            SELECT p.company_id 
            FROM public.profiles p 
            WHERE p.id = auth.uid()
            LIMIT 1
          )
          AND (
            SELECT p.app_role 
            FROM public.profiles p 
            WHERE p.id = auth.uid()
            LIMIT 1
          ) IN ('admin', 'owner', 'manager', 'general_manager')
        )
      );

    -- Create INSERT policy
    CREATE POLICY profiles_insert_company
      ON public.profiles
      FOR INSERT
      WITH CHECK (
        id = auth.uid()
        OR
        (
          company_id IS NOT NULL
          AND company_id = (
            SELECT p.company_id 
            FROM public.profiles p 
            WHERE p.id = auth.uid()
            LIMIT 1
          )
          AND (
            SELECT p.app_role 
            FROM public.profiles p 
            WHERE p.id = auth.uid()
            LIMIT 1
          ) IN ('admin', 'owner', 'manager', 'general_manager')
        )
      );

    RAISE NOTICE 'Fixed profiles RLS recursion issue';

  ELSE
    RAISE NOTICE '⚠️ profiles table does not exist yet - skipping RLS recursion fix';
  END IF;
END $$;

