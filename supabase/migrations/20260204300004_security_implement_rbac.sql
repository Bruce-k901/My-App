-- ============================================================================
-- Migration: Security Fix - Implement Role-Based Access Control (RBAC)
-- Severity: HIGH
-- Description: Enhances the company_access function to support role-based
--              authorization checks for different permission levels
-- ============================================================================

BEGIN;

-- ============================================================================
-- HIGH FIX: Create enhanced company access function with RBAC support
-- ============================================================================

-- First, create a helper function to get user's role in a company
-- This avoids recursion by not using RLS-protected tables in policy checks
CREATE OR REPLACE FUNCTION stockly.get_user_role(p_user_id UUID, p_company_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Try original schema first (user_id, company_id, role)
    SELECT role INTO v_role
    FROM public.user_roles
    WHERE user_id = p_user_id AND company_id = p_company_id
    LIMIT 1;

    IF v_role IS NOT NULL THEN
        RETURN v_role;
    END IF;

    -- Try newer schema (profile_id, role_id) with roles table
    SELECT r.name INTO v_role
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.profile_id = p_user_id
    LIMIT 1;

    RETURN COALESCE(v_role, 'staff'); -- Default to staff if no role found
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create the role hierarchy as a function
CREATE OR REPLACE FUNCTION stockly.role_has_permission(
    p_user_role TEXT,
    p_required_role TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Role hierarchy: owner > admin > manager > supervisor > staff
    RETURN CASE p_required_role
        WHEN 'staff' THEN
            p_user_role IN ('owner', 'admin', 'manager', 'supervisor', 'staff')
        WHEN 'supervisor' THEN
            p_user_role IN ('owner', 'admin', 'manager', 'supervisor')
        WHEN 'manager' THEN
            p_user_role IN ('owner', 'admin', 'manager')
        WHEN 'admin' THEN
            p_user_role IN ('owner', 'admin')
        WHEN 'owner' THEN
            p_user_role = 'owner'
        ELSE
            FALSE
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================================
-- Enhanced company access function with optional role checking
-- ============================================================================

-- Keep the original function for backward compatibility
-- (existing RLS policies use this without role parameter)

-- Create new function with role-based access
CREATE OR REPLACE FUNCTION stockly.stockly_company_access_with_role(
    p_company_id UUID,
    p_required_role TEXT DEFAULT 'staff'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_company_id UUID;
    v_user_role TEXT;
BEGIN
    -- Get user's company from profiles
    SELECT company_id INTO v_user_company_id
    FROM public.profiles
    WHERE id = auth.uid();

    -- Check if user belongs to the requested company
    IF v_user_company_id IS NULL OR v_user_company_id != p_company_id THEN
        RETURN FALSE;
    END IF;

    -- Get user's role in the company
    v_user_role := stockly.get_user_role(auth.uid(), p_company_id);

    -- Check if user's role meets the required level
    RETURN stockly.role_has_permission(v_user_role, p_required_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- Create role-specific check functions for common use cases
-- ============================================================================

-- Check if user is at least a manager (can modify business data)
CREATE OR REPLACE FUNCTION stockly.is_manager_or_above(p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN stockly.stockly_company_access_with_role(p_company_id, 'manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is at least an admin (can modify company settings)
CREATE OR REPLACE FUNCTION stockly.is_admin_or_above(p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN stockly.stockly_company_access_with_role(p_company_id, 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is the owner (can delete company, transfer ownership)
CREATE OR REPLACE FUNCTION stockly.is_owner(p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN stockly.stockly_company_access_with_role(p_company_id, 'owner');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- Create example role-restricted policies (can be used as templates)
-- ============================================================================

-- Example: Restrict recipe deletion to managers and above
-- (This is commented out - apply selectively based on business requirements)
/*
DROP POLICY IF EXISTS recipes_delete_managers ON stockly.recipes;
CREATE POLICY recipes_delete_managers ON stockly.recipes
    FOR DELETE USING (stockly.is_manager_or_above(company_id));

DROP POLICY IF EXISTS recipes_insert_update ON stockly.recipes;
CREATE POLICY recipes_insert_update ON stockly.recipes
    FOR INSERT WITH CHECK (stockly.stockly_company_access(company_id));

CREATE POLICY recipes_update ON stockly.recipes
    FOR UPDATE USING (stockly.stockly_company_access(company_id));

CREATE POLICY recipes_select ON stockly.recipes
    FOR SELECT USING (stockly.stockly_company_access(company_id));
*/

-- ============================================================================
-- Document the role hierarchy for reference
-- ============================================================================

COMMENT ON FUNCTION stockly.stockly_company_access_with_role IS
'Checks if the current user has access to a company with a minimum role level.
Role hierarchy (highest to lowest): owner > admin > manager > supervisor > staff

Usage:
  - stockly.stockly_company_access_with_role(company_id, ''staff'')   -- Any employee
  - stockly.stockly_company_access_with_role(company_id, ''supervisor'') -- Supervisors+
  - stockly.stockly_company_access_with_role(company_id, ''manager'')  -- Managers+
  - stockly.stockly_company_access_with_role(company_id, ''admin'')    -- Admins+
  - stockly.stockly_company_access_with_role(company_id, ''owner'')    -- Owner only

Convenience functions:
  - stockly.is_manager_or_above(company_id)
  - stockly.is_admin_or_above(company_id)
  - stockly.is_owner(company_id)
';

COMMIT;

SELECT 'Security fix applied: RBAC functions implemented for role-based authorization' as result;
