-- ============================================================================
-- Check SELECT Policies
-- INSERT with .select() requires SELECT access - this might be blocking!
-- ============================================================================

-- Check all SELECT policies
SELECT 
  '=== SELECT POLICIES ===' as section,
  policyname,
  cmd,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'conversations'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- If there are no SELECT policies, that's the problem!
-- INSERT with .select() needs a SELECT policy to return the row

