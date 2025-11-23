-- ============================================================================
-- Migration: 20250223000003_fix_incidents_rls_policies.sql
-- Description: Fixes RLS policies for incidents table to allow authenticated users to insert incidents
-- ============================================================================

-- Drop all existing policies on incidents table to avoid conflicts
DROP POLICY IF EXISTS "Users can view incidents for their company" ON public.incidents;
DROP POLICY IF EXISTS "Users can insert incidents for their company" ON public.incidents;
DROP POLICY IF EXISTS "Users can update incidents for their company" ON public.incidents;
DROP POLICY IF EXISTS "tenant_select_incidents" ON public.incidents;
DROP POLICY IF EXISTS "tenant_modify_incidents" ON public.incidents;
DROP POLICY IF EXISTS "incidents_company_access" ON public.incidents;
DROP POLICY IF EXISTS "incidents_select_company" ON public.incidents;
DROP POLICY IF EXISTS "incidents_insert_company" ON public.incidents;
DROP POLICY IF EXISTS "incidents_update_company" ON public.incidents;

-- Ensure RLS is enabled
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- Create comprehensive SELECT policy
-- Users can view incidents in their company
CREATE POLICY "incidents_select_company"
  ON public.incidents
  FOR SELECT
  USING (
    -- Service role bypass
    public.is_service_role()
    OR
    -- User has access via company_id
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = incidents.company_id
    )
    OR
    -- User has site access (if has_site_access function exists)
    (
      EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'has_site_access' 
        AND pronamespace = 'public'::regnamespace
      )
      AND public.has_site_access(incidents.site_id)
    )
  );

-- Create comprehensive INSERT policy
-- Users can insert incidents for their company
CREATE POLICY "incidents_insert_company"
  ON public.incidents
  FOR INSERT
  WITH CHECK (
    -- Service role bypass
    public.is_service_role()
    OR
    -- User has access via company_id
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = incidents.company_id
    )
    OR
    -- User has site access (if has_site_access function exists)
    (
      EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'has_site_access' 
        AND pronamespace = 'public'::regnamespace
      )
      AND public.has_site_access(incidents.site_id)
    )
  );

-- Create comprehensive UPDATE policy
-- Users can update incidents in their company
CREATE POLICY "incidents_update_company"
  ON public.incidents
  FOR UPDATE
  USING (
    -- Service role bypass
    public.is_service_role()
    OR
    -- User has access via company_id
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = incidents.company_id
    )
    OR
    -- User has site access (if has_site_access function exists)
    (
      EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'has_site_access' 
        AND pronamespace = 'public'::regnamespace
      )
      AND public.has_site_access(incidents.site_id)
    )
  )
  WITH CHECK (
    -- Service role bypass
    public.is_service_role()
    OR
    -- User has access via company_id
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = incidents.company_id
    )
    OR
    -- User has site access (if has_site_access function exists)
    (
      EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'has_site_access' 
        AND pronamespace = 'public'::regnamespace
      )
      AND public.has_site_access(incidents.site_id)
    )
  );

-- Create DELETE policy (if needed)
-- Users can delete incidents in their company (only admins/managers)
CREATE POLICY "incidents_delete_company"
  ON public.incidents
  FOR DELETE
  USING (
    -- Service role bypass
    public.is_service_role()
    OR
    -- User has access via company_id and is admin/manager/owner
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = incidents.company_id
        AND COALESCE(p.app_role, 'Staff') IN ('Owner', 'Admin', 'Manager')
    )
  );

-- Add comments
COMMENT ON POLICY "incidents_select_company" ON public.incidents IS 'Allows users to view incidents in their company';
COMMENT ON POLICY "incidents_insert_company" ON public.incidents IS 'Allows authenticated users to insert incidents for their company';
COMMENT ON POLICY "incidents_update_company" ON public.incidents IS 'Allows users to update incidents in their company';
COMMENT ON POLICY "incidents_delete_company" ON public.incidents IS 'Allows admins/managers to delete incidents in their company';

