-- Migration: Optimize RLS Policy Performance
-- Priority: P2 - HIGH
-- Description: Optimize site access function and add caching
-- Expected Impact: Reduces RLS overhead from O(n) to O(1) per query

-- ============================================
-- CACHED USER SITE ACCESS FUNCTION
-- ============================================

-- Create a function to get all site IDs a user has access to
-- This allows using IN() instead of EXISTS subquery for each row
CREATE OR REPLACE FUNCTION public.user_accessible_site_ids()
RETURNS UUID[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_sites UUID[];
    v_cached TEXT;
BEGIN
    -- Try to get from session cache first
    BEGIN
        v_cached := current_setting('app.user_site_ids', true);
        IF v_cached IS NOT NULL AND v_cached != '' THEN
            RETURN v_cached::UUID[];
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Setting doesn't exist, continue to fetch
        NULL;
    END;

    -- Get all sites user has access to
    SELECT ARRAY(
        SELECT DISTINCT site_id FROM (
            -- Direct site access
            SELECT usa.site_id
            FROM user_site_access usa
            WHERE usa.auth_user_id = auth.uid()

            UNION

            -- Profile-based access (site_id or home_site)
            SELECT COALESCE(p.site_id, p.home_site) as site_id
            FROM profiles p
            WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
              AND COALESCE(p.site_id, p.home_site) IS NOT NULL

            UNION

            -- Company-wide access for owners/admins
            SELECT s.id as site_id
            FROM profiles p
            JOIN sites s ON s.company_id = p.company_id
            WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
              AND LOWER(COALESCE(p.app_role::text, '')) IN ('owner', 'admin', 'area_manager', 'general_manager')
        ) accessible_sites
        WHERE site_id IS NOT NULL
    ) INTO v_sites;

    -- Cache for this transaction
    IF v_sites IS NOT NULL AND array_length(v_sites, 1) > 0 THEN
        PERFORM set_config('app.user_site_ids', v_sites::TEXT, true);
    END IF;

    RETURN COALESCE(v_sites, ARRAY[]::UUID[]);
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.user_accessible_site_ids() TO authenticated;

-- ============================================
-- OPTIMIZED SITE ACCESS CHECK USING CACHED ARRAY
-- ============================================

-- Create optimized version that uses the cached array
CREATE OR REPLACE FUNCTION public.has_planly_site_access_fast(target_site_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
    SELECT target_site_id = ANY(public.user_accessible_site_ids());
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.has_planly_site_access_fast(UUID) TO authenticated;

-- ============================================
-- CACHED COMPANY ID FUNCTION (for stockly tables)
-- ============================================

-- Create function to cache and return user's company_id
CREATE OR REPLACE FUNCTION public.user_company_id()
RETURNS UUID AS $$
DECLARE
    v_company_id UUID;
    v_cached TEXT;
BEGIN
    -- Try to get from session cache first
    BEGIN
        v_cached := current_setting('app.user_company_id', true);
        IF v_cached IS NOT NULL AND v_cached != '' THEN
            RETURN v_cached::UUID;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Setting doesn't exist or invalid, continue to fetch
        NULL;
    END;

    -- Fetch from profiles
    SELECT p.company_id INTO v_company_id
    FROM public.profiles p
    WHERE p.id = auth.uid() OR p.auth_user_id = auth.uid()
    LIMIT 1;

    -- Cache for this transaction if we got a value
    IF v_company_id IS NOT NULL THEN
        PERFORM set_config('app.user_company_id', v_company_id::TEXT, true);
    END IF;

    RETURN v_company_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.user_company_id() TO authenticated;

-- ============================================
-- FIX STOCKLY COMPANY ACCESS FUNCTION
-- Remove expensive information_schema check
-- ============================================

CREATE OR REPLACE FUNCTION stockly.stockly_company_access(p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Use cached company_id function instead of querying profiles each time
    RETURN p_company_id = public.user_company_id();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- ADD INDEX FOR USER SITE ACCESS LOOKUPS
-- ============================================

-- Index for fast auth_user_id lookups
CREATE INDEX IF NOT EXISTS idx_user_site_access_auth_user
    ON user_site_access(auth_user_id);

-- Composite index for the most common access pattern
CREATE INDEX IF NOT EXISTS idx_user_site_access_auth_site
    ON user_site_access(auth_user_id, site_id);

-- Index for profile lookups by auth_user_id (often NULL or different from id)
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id
    ON profiles(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Composite index for profile company/role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_company_role
    ON profiles(company_id, app_role);
