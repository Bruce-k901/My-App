-- ============================================================================
-- TEMPORARILY Disable RLS to Test if INSERT Works
-- This will help us determine if the issue is RLS or something else
-- WARNING: Only use this for testing! Re-enable RLS after testing.
-- ============================================================================

BEGIN;

-- Temporarily disable RLS
ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 
  '=== RLS STATUS ===' as section,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'conversations';

COMMIT;

-- Now try creating a conversation from the frontend
-- If it works, the issue is definitely with the RLS policy
-- If it still fails, there's another issue (permissions, constraints, etc.)

-- TO RE-ENABLE RLS AFTER TESTING:
-- ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

