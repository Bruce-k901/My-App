-- ============================================================================
-- Migration: Force PostgREST schema reload
-- ============================================================================

-- Force PostgREST schema reload (multiple times to ensure it takes effect)
NOTIFY pgrst, 'reload schema';
SELECT pg_sleep(0.5);
NOTIFY pgrst, 'reload schema';
