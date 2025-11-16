-- ============================================================================
-- Messaging System Diagnostic Script
-- Run this in Supabase SQL Editor to check everything
-- ============================================================================

-- 1. Check if tables exist
SELECT '=== TABLES CHECK ===' as section;
SELECT 
  table_name,
  CASE WHEN table_name IS NOT NULL THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'conversations',
    'conversation_participants',
    'messages',
    'message_reads',
    'message_reactions',
    'message_mentions',
    'typing_indicators'
  )
ORDER BY table_name;

-- 2. Check RLS status on tables
SELECT '=== RLS STATUS ===' as section;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'conversations',
    'conversation_participants',
    'messages',
    'message_reads',
    'message_reactions',
    'message_mentions',
    'typing_indicators'
  )
ORDER BY tablename;

-- 3. Check all policies on conversations table
SELECT '=== CONVERSATIONS POLICIES ===' as section;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversations'
ORDER BY policyname;

-- 4. Check all policies on conversation_participants table
SELECT '=== CONVERSATION_PARTICIPANTS POLICIES ===' as section;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversation_participants'
ORDER BY policyname;

-- 5. Check functions
SELECT '=== FUNCTIONS CHECK ===' as section;
SELECT 
  routine_name,
  routine_type,
  security_type,
  CASE WHEN routine_name IS NOT NULL THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_conversation_participant',
    'check_user_company_match',
    'user_belongs_to_company',
    'user_belongs_to_site',
    'update_conversation_timestamp',
    'update_message_timestamp'
  )
ORDER BY routine_name;

-- 6. Check table permissions
SELECT '=== TABLE PERMISSIONS ===' as section;
SELECT 
  grantee,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'conversations'
  AND grantee IN ('authenticated', 'anon', 'public')
ORDER BY grantee, privilege_type;

-- 7. Check current user and profile
SELECT '=== CURRENT USER INFO ===' as section;
SELECT 
  auth.uid() as current_user_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as current_user_email;

-- 8. Check user's profile and company
SELECT '=== USER PROFILE ===' as section;
SELECT 
  id,
  full_name,
  email,
  company_id,
  site_id,
  app_role
FROM public.profiles
WHERE id = auth.uid();

-- 9. Test the check_user_company_match function (if it exists)
SELECT '=== FUNCTION TEST ===' as section;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.routines 
      WHERE routine_name = 'check_user_company_match'
    ) THEN
      CASE 
        WHEN public.check_user_company_match(
          auth.uid(),
          (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        ) THEN 'TRUE - Function works'
        ELSE 'FALSE - Function returned false'
      END
    ELSE 'Function does not exist'
  END as function_test_result;

-- 10. Check for any conflicting policies
SELECT '=== POLICY CONFLICTS CHECK ===' as section;
SELECT 
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('conversations', 'conversation_participants')
  AND cmd = 'INSERT'
GROUP BY tablename;

-- 11. Check indexes
SELECT '=== INDEXES CHECK ===' as section;
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'conversations',
    'conversation_participants',
    'messages'
  )
ORDER BY tablename, indexname;

-- 12. Test INSERT permission (dry run - won't actually insert)
SELECT '=== INSERT PERMISSION TEST ===' as section;
SELECT 
  CASE 
    WHEN has_table_privilege('authenticated', 'conversations', 'INSERT') 
    THEN '✓ INSERT permission granted'
    ELSE '✗ INSERT permission DENIED'
  END as insert_permission_status;

