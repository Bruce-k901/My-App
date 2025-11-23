-- ============================================================================
-- QUICK DIAGNOSTIC: Find the Correct PPM Table
-- ============================================================================
-- Run each query separately to find which table exists
-- ============================================================================

-- Test 1: Does ppm_schedule exist?
SELECT 'ppm_schedule exists' as result, COUNT(*) as row_count
FROM ppm_schedule
LIMIT 1;

-- Test 2: Does ppm_schedule_redundant exist?
-- SELECT 'ppm_schedule_redundant exists' as result, COUNT(*) as row_count
-- FROM ppm_schedule_redundant
-- LIMIT 1;

-- Test 3: Does ppm_schedules exist?
-- SELECT 'ppm_schedules exists' as result, COUNT(*) as row_count
-- FROM ppm_schedules
-- LIMIT 1;

-- ============================================================================
-- INSTRUCTIONS:
-- 1. Run Test 1 first
-- 2. If it errors, comment it out and uncomment Test 2
-- 3. If Test 2 errors, comment it out and uncomment Test 3
-- 4. Whichever one works, that's your table!
-- ============================================================================
