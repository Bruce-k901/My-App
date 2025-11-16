-- ============================================================================
-- Check ALL Policies and RLS Status
-- The issue might be with SELECT policies or other policies blocking INSERT
-- ============================================================================

-- Check RLS status
SELECT 
  '=== RLS STATUS ===' as section,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'conversations';

-- Check ALL policies (not just INSERT)
SELECT 
  '=== ALL POLICIES ===' as section,
  policyname,
  cmd as command,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversations'
ORDER BY cmd, policyname;

-- Check if there are any triggers that might be blocking
SELECT 
  '=== TRIGGERS ===' as section,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'conversations';

-- Check table constraints
SELECT 
  '=== CONSTRAINTS ===' as section,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name = 'conversations';

-- Check if there's a USING clause policy that might be blocking
-- (USING clauses apply to SELECT, UPDATE, DELETE - but can affect INSERT if there's a RETURNING clause)
SELECT 
  '=== POLICIES WITH USING CLAUSE ===' as section,
  policyname,
  cmd,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversations'
  AND qual IS NOT NULL;

