-- ============================================================================
-- Migration: 07-fix-user-roles-rls-recursion.sql
-- Description: Fixes infinite recursion in user_roles RLS policies
-- Run this AFTER 06-stockly-public-views.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- FIX USER_ROLES RLS RECURSION
-- ============================================================================
-- The user_roles table is causing infinite recursion when accessed via
-- public views. We'll either disable RLS on it or create a simple policy
-- that doesn't cause recursion.

-- Check if RLS is enabled on user_roles
DO $$
BEGIN
    -- Disable RLS on user_roles if it's causing recursion
    -- user_roles is a junction table and access should be controlled
    -- via the profiles table and company_id checks
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'user_roles'
        AND rowsecurity = true
    ) THEN
        -- Drop any existing policies first
        DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
        DROP POLICY IF EXISTS user_roles_all ON public.user_roles;
        
        -- Disable RLS on user_roles
        -- Access is controlled via profiles.company_id checks in other policies
        ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE 'RLS disabled on user_roles to prevent recursion';
    ELSE
        RAISE NOTICE 'RLS already disabled on user_roles or table does not exist';
    END IF;
END $$;

-- ============================================================================
-- ALTERNATIVE: If we need RLS on user_roles, create a simple policy
-- ============================================================================
-- Uncomment below if RLS is required on user_roles:
/*
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Simple policy: users can see their own roles
CREATE POLICY user_roles_own ON public.user_roles
    FOR SELECT
    USING (user_id = auth.uid());
*/

COMMIT;

SELECT 'user_roles RLS recursion fix applied successfully' as result;
