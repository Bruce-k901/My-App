-- TEMPORARY: Disable RLS on messaging_channels to test if that's the issue
-- WARNING: This removes security! Only use for testing, then re-enable RLS

BEGIN;

-- Disable RLS temporarily
ALTER TABLE messaging_channels DISABLE ROW LEVEL SECURITY;

COMMIT;

-- To re-enable RLS later, run:
-- ALTER TABLE messaging_channels ENABLE ROW LEVEL SECURITY;

