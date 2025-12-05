-- ============================================================================
-- DIAGNOSE SITES INSERT RLS ISSUE
-- ============================================================================
-- This script helps diagnose why sites INSERT is failing
-- Run this while logged in as the user experiencing the issue
-- ============================================================================

-- Step 1: Check if helper functions exist
SELECT 
  '=== HELPER FUNCTIONS ===' AS section,
  proname AS function_name,
  pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname IN ('get_user_company_id', 'is_user_admin_or_manager', 'is_user_owner_or_admin')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- Step 2: Test helper functions (run as current user)
SELECT 
  '=== CURRENT USER INFO ===' AS section,
  auth.uid() AS user_id,
  public.get_user_company_id() AS user_company_id,
  public.is_user_admin_or_manager() AS is_admin_or_manager,
  public.is_user_owner_or_admin() AS is_owner_or_admin;

-- Step 3: Check current user's profile
SELECT 
  '=== CURRENT USER PROFILE ===' AS section,
  id,
  email,
  full_name,
  company_id,
  app_role,
  created_at
FROM public.profiles
WHERE id = auth.uid();

-- Step 4: Check existing RLS policies on sites table
SELECT 
  '=== SITES RLS POLICIES ===' AS section,
  policyname,
  cmd AS command,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'sites'
ORDER BY policyname;

-- Step 5: Check if RLS is enabled on sites table
SELECT 
  '=== RLS STATUS ===' AS section,
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'sites';

-- Step 6: Test INSERT permission (this will show what's failing)
-- Note: This is a dry-run test - it won't actually insert
DO $$
DECLARE
  v_test_company_id UUID;
  v_can_insert BOOLEAN := false;
  v_error_message TEXT;
BEGIN
  -- Get user's company_id
  v_test_company_id := public.get_user_company_id();
  
  IF v_test_company_id IS NULL THEN
    RAISE NOTICE '❌ User has no company_id - cannot insert sites';
    RETURN;
  END IF;
  
  -- Check if user is owner/admin
  IF public.is_user_owner_or_admin() = false THEN
    RAISE NOTICE '❌ User is not owner or admin - cannot insert sites';
    RETURN;
  END IF;
  
  -- Try to simulate the INSERT check
  -- This will show us what the policy is checking
  RAISE NOTICE '✅ User company_id: %', v_test_company_id;
  RAISE NOTICE '✅ User is owner/admin: %', public.is_user_owner_or_admin();
  RAISE NOTICE '✅ All checks passed - INSERT should work';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Error during check: %', SQLERRM;
END $$;

-- Step 7: Check for conflicting policies
SELECT 
  '=== ALL POLICIES ON SITES ===' AS section,
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'sites'
ORDER BY policyname;
