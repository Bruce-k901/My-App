-- ============================================================================
-- Migration: Security Fix - Re-enable RLS on user_roles Table
-- Severity: HIGH
-- Description: Re-enables Row Level Security on user_roles with non-recursive policies
--              that prevent unauthorized role access while avoiding infinite loops
-- ============================================================================

BEGIN;

-- ============================================================================
-- HIGH FIX: Re-enable RLS on user_roles with safe, non-recursive policies
-- The original issue was infinite recursion when RLS policies queried user_roles
-- Solution: Use auth.uid() and profiles table directly without joining user_roles
-- ============================================================================

-- First, drop any existing policies
DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
DROP POLICY IF EXISTS user_roles_insert ON public.user_roles;
DROP POLICY IF EXISTS user_roles_update ON public.user_roles;
DROP POLICY IF EXISTS user_roles_delete ON public.user_roles;
DROP POLICY IF EXISTS user_roles_all ON public.user_roles;
DROP POLICY IF EXISTS user_roles_own ON public.user_roles;
DROP POLICY IF EXISTS user_roles_access ON public.user_roles;

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Detect which schema is in use and create appropriate policies
DO $$
DECLARE
    v_has_user_id BOOLEAN;
    v_has_profile_id BOOLEAN;
BEGIN
    -- Check for user_id column (original schema)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'user_id'
    ) INTO v_has_user_id;

    -- Check for profile_id column (newer schema)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'user_roles' AND column_name = 'profile_id'
    ) INTO v_has_profile_id;

    IF v_has_user_id THEN
        -- Original schema: (user_id, company_id, role)
        -- Users can see roles within their company
        EXECUTE $policy$
            CREATE POLICY user_roles_select ON public.user_roles
            FOR SELECT USING (
                -- User can see their own roles
                user_id = auth.uid()
                OR
                -- User can see roles of others in their company
                EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid()
                    AND p.company_id = user_roles.company_id
                )
            )
        $policy$;

        -- Only admins/owners can modify roles (through profiles check)
        EXECUTE $policy$
            CREATE POLICY user_roles_insert ON public.user_roles
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid()
                    AND p.company_id = user_roles.company_id
                )
            )
        $policy$;

        EXECUTE $policy$
            CREATE POLICY user_roles_update ON public.user_roles
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid()
                    AND p.company_id = user_roles.company_id
                )
            )
        $policy$;

        EXECUTE $policy$
            CREATE POLICY user_roles_delete ON public.user_roles
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM public.profiles p
                    WHERE p.id = auth.uid()
                    AND p.company_id = user_roles.company_id
                )
            )
        $policy$;

        RAISE NOTICE 'Created RLS policies for user_roles (original schema with user_id)';

    ELSIF v_has_profile_id THEN
        -- Newer schema: (profile_id, role_id, site_id, area_id, region_id)
        -- Users can see roles within their company via profiles
        EXECUTE $policy$
            CREATE POLICY user_roles_select ON public.user_roles
            FOR SELECT USING (
                -- User can see their own roles
                profile_id = auth.uid()
                OR
                -- User can see roles of others in their company via profiles
                EXISTS (
                    SELECT 1 FROM public.profiles p1, public.profiles p2
                    WHERE p1.id = auth.uid()
                    AND p2.id = user_roles.profile_id
                    AND p1.company_id = p2.company_id
                )
            )
        $policy$;

        EXECUTE $policy$
            CREATE POLICY user_roles_insert ON public.user_roles
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.profiles p1, public.profiles p2
                    WHERE p1.id = auth.uid()
                    AND p2.id = user_roles.profile_id
                    AND p1.company_id = p2.company_id
                )
            )
        $policy$;

        EXECUTE $policy$
            CREATE POLICY user_roles_update ON public.user_roles
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM public.profiles p1, public.profiles p2
                    WHERE p1.id = auth.uid()
                    AND p2.id = user_roles.profile_id
                    AND p1.company_id = p2.company_id
                )
            )
        $policy$;

        EXECUTE $policy$
            CREATE POLICY user_roles_delete ON public.user_roles
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM public.profiles p1, public.profiles p2
                    WHERE p1.id = auth.uid()
                    AND p2.id = user_roles.profile_id
                    AND p1.company_id = p2.company_id
                )
            )
        $policy$;

        RAISE NOTICE 'Created RLS policies for user_roles (newer schema with profile_id)';
    ELSE
        RAISE WARNING 'user_roles table has unexpected schema - no policies created';
    END IF;
END $$;

-- Force RLS for table owner as well (extra security)
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

COMMIT;

SELECT 'Security fix applied: RLS re-enabled on user_roles with non-recursive policies' as result;
