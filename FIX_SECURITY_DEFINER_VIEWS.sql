-- ============================================================================
-- Fix Security Definer Views - Helper Script
-- ============================================================================
-- This script helps you fix views that use SECURITY DEFINER
-- ============================================================================

-- STEP 1: Get view definitions
-- Run this query in Supabase SQL Editor to see all view definitions:
SELECT 
  table_name, 
  view_definition,
  CASE 
    WHEN view_definition LIKE '%SECURITY DEFINER%' THEN 'HAS SECURITY DEFINER'
    ELSE 'OK'
  END as security_status
FROM information_schema.views 
WHERE table_schema = 'public' 
AND table_name IN (
  'ppm_schedule', 
  'profile_settings', 
  'site_compliance_score_latest', 
  'ppm_full_schedule', 
  'v_current_profile', 
  'tenant_compliance_overview', 
  'v_user_sites'
)
ORDER BY table_name;

-- STEP 2: For each view that has SECURITY DEFINER, recreate it without SECURITY DEFINER
-- Copy the view_definition from Step 1, remove any SECURITY DEFINER clause,
-- and run the DROP/CREATE statements below

-- Example template:
-- DROP VIEW IF EXISTS public.view_name CASCADE;
-- CREATE VIEW public.view_name AS
--   <view_definition_without_security_definer>;

-- ============================================================================
-- Views we know about (from migrations):
-- ============================================================================

-- site_compliance_score_latest - Already fixed in FIX_SECURITY_ISSUES.sql
-- tenant_compliance_overview - Already fixed in FIX_SECURITY_ISSUES.sql

-- For the remaining views, you'll need to:
-- 1. Query their definitions using the query above
-- 2. Recreate them without SECURITY DEFINER
-- 3. Test that they still work correctly

-- ============================================================================
-- Alternative: Drop views if they're not critical
-- ============================================================================

-- If a view is not actively used, you can drop it:
-- DROP VIEW IF EXISTS public.view_name CASCADE;

-- Check usage before dropping:
-- SELECT table_name, view_definition 
-- FROM information_schema.views 
-- WHERE table_schema = 'public' 
-- AND table_name = 'view_name';

