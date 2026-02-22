-- ============================================================================
-- PRE-FLIGHT CHECK - RUN BEFORE ANY CLEANUP OR RLS CHANGES
-- ============================================================================
-- 
-- IMPORTANT: Run this script FIRST before making any database changes!
-- This will help identify potential issues and create backups.
--
-- Usage:
--   1. Run this entire script in Supabase SQL Editor
--   2. Save the output/results
--   3. Review all warnings and errors
--   4. Only proceed with cleanup if all checks pass (or you understand the risks)
--
-- ============================================================================

-- ============================================
-- 1. BACKUP CURRENT POLICIES
-- ============================================
-- Save this output before making any RLS policy changes!
-- This allows you to restore policies if something goes wrong.

SELECT 
  'BACKUP: Save this output before making changes!' as warning,
  tablename,
  policyname,
  cmd,
  pg_get_expr(qual, 'public.' || tablename::text) as using_expression,
  pg_get_expr(with_check, 'public.' || tablename::text) as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 2. CHECK ADMIN USER STATUS
-- ============================================
-- Verify the admin user has a company_id set
-- Missing company_id can cause access issues

SELECT 
  '👤 Admin User Status' as check_type,
  id,
  email,
  company_id,
  app_role,
  CASE 
    WHEN company_id IS NULL THEN '❌ DANGER: Missing company_id'
    ELSE '✅ OK'
  END as status
FROM profiles 
WHERE id = '8066c4f2-fbff-4255-be96-71acf151473d';

-- ============================================
-- 3. CHECK HELPER FUNCTIONS EXIST
-- ============================================
-- These functions must be SECURITY DEFINER to avoid infinite recursion
-- in RLS policies. If they're missing or not SECURITY DEFINER, RLS will break.

SELECT 
  '🔧 Helper Functions' as check_type,
  proname as function_name,
  CASE 
    WHEN prosecdef THEN '✅ SECURITY DEFINER (correct)'
    ELSE '❌ NOT SECURITY DEFINER (will cause infinite recursion)'
  END as status
FROM pg_proc
WHERE proname IN ('get_user_company_id', 'get_user_role')
ORDER BY proname;

-- ============================================
-- 4. CHECK FOR DUPLICATE PROFILES
-- ============================================
-- Duplicate profiles with same auth_user_id can cause data corruption
-- when using .or() queries in application code

SELECT 
  '👥 Duplicate Profiles Check' as check_type,
  auth_user_id,
  COUNT(*) as duplicate_count,
  array_agg(id) as profile_ids,
  array_agg(email) as emails,
  CASE 
    WHEN COUNT(*) > 1 THEN '❌ DANGER: Duplicates found'
    ELSE '✅ OK'
  END as status
FROM profiles
WHERE auth_user_id IS NOT NULL
GROUP BY auth_user_id
HAVING COUNT(*) > 1;

-- ============================================
-- 5. CHECK PROTECTION TRIGGER EXISTS
-- ============================================
-- This trigger prevents accidental deletion/modification of critical admin user
-- If missing, admin user could be accidentally deleted or modified

SELECT 
  '🛡️ Protection Trigger' as check_type,
  trigger_name,
  event_object_table,
  '✅ Trigger exists' as status
FROM information_schema.triggers
WHERE trigger_name = 'protect_admin_user_trigger'
  AND event_object_schema = 'public'
UNION ALL
SELECT 
  '🛡️ Protection Trigger',
  'MISSING',
  'profiles',
  '❌ DANGER: Trigger not found'
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.triggers 
  WHERE trigger_name = 'protect_admin_user_trigger'
    AND event_object_schema = 'public'
);

-- ============================================
-- 6. CHECK FOR PROFILES WITH NULL COMPANY_ID
-- ============================================
-- Profiles without company_id may not be able to access company data

SELECT 
  '🏢 Profiles Without Company' as check_type,
  COUNT(*) as count,
  array_agg(id) as profile_ids,
  array_agg(email) as emails,
  CASE 
    WHEN COUNT(*) > 0 THEN '⚠️ WARNING: Some profiles missing company_id'
    ELSE '✅ OK'
  END as status
FROM profiles
WHERE company_id IS NULL;

-- ============================================
-- 7. CHECK FOR PROFILES WHERE id != auth_user_id
-- ============================================
-- Mismatched IDs can cause issues with .or() queries in application code

SELECT 
  '🔄 Profile ID Mismatch Check' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '⚠️ WARNING: Some profiles have id != auth_user_id'
    ELSE '✅ OK'
  END as status
FROM profiles
WHERE auth_user_id IS NOT NULL
  AND id != auth_user_id;

-- ============================================
-- SUMMARY
-- ============================================
-- Review all results above before proceeding with cleanup!
-- 
-- Red flags (❌ DANGER):
--   - Admin user missing company_id
--   - Helper functions missing or not SECURITY DEFINER
--   - Duplicate profiles found
--   - Protection trigger missing
--
-- Yellow flags (⚠️ WARNING):
--   - Profiles without company_id
--   - Profile ID mismatches
--
-- If you see any red flags, fix them BEFORE running cleanup scripts!

