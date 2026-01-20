-- Migration: Fix Profiles INSERT RLS Policy
-- Description: Allows managers and admins to create new employee profiles
-- Date: 2025-01-15

DO $$
BEGIN
  -- Only proceed if profiles table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    
    -- Drop existing INSERT policies to avoid conflicts
    DROP POLICY IF EXISTS profiles_insert_company ON public.profiles;
    DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
    
    -- Ensure RLS is enabled
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    
    -- Create or replace security definer function to get user's company_id without RLS recursion
    CREATE OR REPLACE FUNCTION public.get_user_company_id()
    RETURNS UUID
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    SET search_path = public
    AS $function$
    DECLARE
      v_company_id UUID;
    BEGIN
      -- SECURITY DEFINER bypasses RLS - this query won't trigger policy evaluation
      SELECT company_id INTO v_company_id
      FROM public.profiles
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
      LIMIT 1;
      
      RETURN v_company_id;
    END;
    $function$;
    
    -- Grant execute permission
    GRANT EXECUTE ON FUNCTION public.get_user_company_id() TO authenticated;
    
    -- Create or replace security definer function to check if user is admin/manager
    CREATE OR REPLACE FUNCTION public.is_user_admin_or_manager()
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    SECURITY DEFINER
    STABLE
    SET search_path = public
    AS $function$
    DECLARE
      v_role TEXT;
    BEGIN
      -- SECURITY DEFINER bypasses RLS
      SELECT app_role INTO v_role
      FROM public.profiles
      WHERE id = auth.uid() OR auth_user_id = auth.uid()
      LIMIT 1;
      
      -- Check if role is admin or manager (case-insensitive)
      RETURN v_role IS NOT NULL AND LOWER(v_role) IN ('admin', 'manager', 'owner', 'general_manager');
    END;
    $function$;
    
    -- Grant execute permission
    GRANT EXECUTE ON FUNCTION public.is_user_admin_or_manager() TO authenticated;
    
    -- Create INSERT policy that allows admins/managers to create profiles in their company
    CREATE POLICY profiles_insert_company
      ON public.profiles
      FOR INSERT
      WITH CHECK (
        -- User can insert their own profile (for signup)
        id = auth.uid()
        OR
        -- Admins/managers can create profiles for their company
        (
          company_id IS NOT NULL
          AND company_id = public.get_user_company_id()
          AND public.get_user_company_id() IS NOT NULL
          AND public.is_user_admin_or_manager() = TRUE
        )
      );
    
    RAISE NOTICE '✅ Profiles INSERT RLS policy created successfully';
  ELSE
    RAISE NOTICE '⚠️ profiles table does not exist yet - skipping INSERT policy creation';
  END IF;
END $$;

