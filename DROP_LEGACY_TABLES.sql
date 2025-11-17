-- ============================================================================
-- Drop Legacy/Unused Tables
-- ============================================================================
-- WARNING: Only run this if you've confirmed these tables are not used
-- ============================================================================

BEGIN;

-- Check if tables exist and have data before dropping
-- Run these queries first to verify:

-- SELECT COUNT(*) FROM public.ppm_schedule_redundant;
-- SELECT COUNT(*) FROM public.user_scope_assignments;
-- SELECT COUNT(*) FROM public.company_regions;
-- SELECT COUNT(*) FROM public.company_areas;

-- If all return 0 or you're sure they're unused, proceed:

-- Drop unused tables (if they exist)
DROP TABLE IF EXISTS public.ppm_schedule_redundant CASCADE;
DROP TABLE IF EXISTS public.user_scope_assignments CASCADE;
DROP TABLE IF EXISTS public.company_regions CASCADE;
DROP TABLE IF EXISTS public.company_areas CASCADE;

COMMIT;

-- ============================================================================
-- Alternative: Keep tables but enable RLS (safer option)
-- ============================================================================
-- If you want to keep these tables for now but fix security issues,
-- use this instead:

-- ALTER TABLE IF EXISTS public.ppm_schedule_redundant ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE IF EXISTS public.user_scope_assignments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE IF EXISTS public.company_regions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE IF EXISTS public.company_areas ENABLE ROW LEVEL SECURITY;

-- Then create basic RLS policies:
-- CREATE POLICY IF NOT EXISTS legacy_table_select_company
--   ON public.ppm_schedule_redundant FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.profiles p
--       WHERE p.id = auth.uid()
--         AND p.company_id = ppm_schedule_redundant.company_id
--     )
--   );
-- (Repeat for other tables as needed)

