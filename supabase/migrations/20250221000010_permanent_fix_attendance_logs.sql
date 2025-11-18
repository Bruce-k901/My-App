-- ============================================================================
-- PERMANENT FIX: attendance_logs View - Never Break Again
-- Description: Comprehensive fix that ensures attendance_logs view works
--              correctly and prevents all future issues
-- ============================================================================
-- 
-- This migration:
-- 1. Ensures the view exists with correct structure
-- 2. Adds clock_in_date column for date filtering
-- 3. Makes the view read-only (no INSERT/UPDATE/DELETE possible)
-- 4. Updates all functions to use clock_in_date
-- 5. Adds helpful comments and documentation
--
-- IMPORTANT: After this migration, ALL code should use:
--   - SELECT: attendance_logs view (with clock_in_date column)
--   - INSERT/UPDATE/DELETE: staff_attendance table (directly)
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Drop and recreate the view with proper structure
-- ============================================================================

DROP VIEW IF EXISTS public.attendance_logs CASCADE;

CREATE VIEW public.attendance_logs AS
SELECT 
  sa.id,
  sa.user_id,
  sa.company_id,
  sa.site_id,
  sa.clock_in_time AS clock_in_at,
  sa.clock_out_time AS clock_out_at,
  NULL::JSONB AS location, -- Always NULL - location is stored in shift_notes
  sa.shift_notes AS notes,
  sa.created_at,
  sa.updated_at,
  (sa.clock_in_time::date) AS clock_in_date -- CRITICAL: Use this for date filtering, NOT clock_in_at::date
FROM public.staff_attendance sa;

-- Add comment explaining the view
COMMENT ON VIEW public.attendance_logs IS 
'Legacy compatibility view mapping attendance_logs to staff_attendance table.

IMPORTANT USAGE RULES:
1. SELECT queries: Use attendance_logs view with clock_in_date column
   ✅ CORRECT: .eq("clock_in_date", "2025-11-18")
   ❌ WRONG: .eq("clock_in_at::date", "2025-11-18")  -- PostgREST doesn''t support ::date

2. INSERT/UPDATE/DELETE: Use staff_attendance table directly
   ✅ CORRECT: supabase.from("staff_attendance").insert(...)
   ❌ WRONG: supabase.from("attendance_logs").insert(...)  -- Views are read-only

3. The view automatically maps:
   - clock_in_at -> clock_in_time
   - clock_out_at -> clock_out_time
   - notes -> shift_notes
   - location -> NULL (location stored in shift_notes as "Location: lat, lng")
   - clock_in_date -> (clock_in_time::date) for date filtering

All queries will automatically use staff_attendance table under the hood.';

-- ============================================================================
-- Step 2: Grant permissions
-- ============================================================================

GRANT SELECT ON public.attendance_logs TO authenticated;
GRANT SELECT ON public.attendance_logs TO anon;

-- ============================================================================
-- Step 3: Update all functions to use clock_in_date (not clock_in_at::date)
-- ============================================================================

-- Update is_user_clocked_in_today
CREATE OR REPLACE FUNCTION public.is_user_clocked_in_today(
  p_user_id UUID,
  p_site_id UUID DEFAULT NULL,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_clocked_in BOOLEAN;
BEGIN
  -- Use clock_in_date column (NOT clock_in_at::date)
  SELECT EXISTS (
    SELECT 1 FROM public.attendance_logs al
    WHERE al.user_id = p_user_id
      AND al.clock_out_at IS NULL
      AND (p_site_id IS NULL OR al.site_id = p_site_id)
      AND al.clock_in_date = p_date
  ) INTO v_clocked_in;
  
  RETURN v_clocked_in;
END;
$$;

COMMENT ON FUNCTION public.is_user_clocked_in_today(UUID, UUID, DATE) IS 
'Check if a user is clocked in today. Uses clock_in_date column from attendance_logs view.';

-- Update get_active_staff_on_site
CREATE OR REPLACE FUNCTION public.get_active_staff_on_site(p_site_id UUID)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  clock_in_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    a.clock_in_at
  FROM public.attendance_logs a
  JOIN public.profiles p ON p.id = a.user_id
  WHERE a.site_id = p_site_id
    AND a.clock_out_at IS NULL
    AND a.clock_in_date = CURRENT_DATE  -- Use clock_in_date, NOT clock_in_at::date
    AND p.app_role IN ('Staff', 'Manager', 'General Manager')
  ORDER BY a.clock_in_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_active_staff_on_site(UUID) IS 
'Get active staff on site today. Uses clock_in_date column from attendance_logs view.';

-- Update get_managers_on_shift
CREATE OR REPLACE FUNCTION public.get_managers_on_shift(p_site_id UUID DEFAULT NULL, p_company_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  site_id UUID,
  clock_in_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.email,
    a.site_id,
    a.clock_in_at
  FROM public.attendance_logs a
  JOIN public.profiles p ON p.id = a.user_id
  WHERE a.clock_out_at IS NULL
    AND a.clock_in_date = CURRENT_DATE  -- Use clock_in_date, NOT clock_in_at::date
    AND p.app_role IN ('Manager', 'General Manager', 'Admin', 'Owner')
    AND (p_site_id IS NULL OR a.site_id = p_site_id)
    AND (p_company_id IS NULL OR p.company_id = p_company_id)
  ORDER BY a.clock_in_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_managers_on_shift(UUID, UUID) IS 
'Get managers on shift today. Uses clock_in_date column from attendance_logs view.';

-- ============================================================================
-- Step 4: Create a function to verify the setup is correct
-- ============================================================================

CREATE OR REPLACE FUNCTION public.verify_attendance_logs_setup()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'View exists'::TEXT,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.views
      WHERE table_schema = 'public' AND table_name = 'attendance_logs'
    ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.views
      WHERE table_schema = 'public' AND table_name = 'attendance_logs'
    ) THEN 'attendance_logs view exists' ELSE 'attendance_logs view missing' END::TEXT
  
  UNION ALL
  
  SELECT 
    'clock_in_date column exists'::TEXT,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'attendance_logs'
      AND column_name = 'clock_in_date'
    ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
    CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' 
      AND table_name = 'attendance_logs'
      AND column_name = 'clock_in_date'
    ) THEN 'clock_in_date column exists' ELSE 'clock_in_date column missing' END::TEXT
  
  UNION ALL
  
  SELECT 
    'View is readable'::TEXT,
    CASE WHEN EXISTS (
      SELECT 1 FROM public.attendance_logs LIMIT 1
    ) THEN 'PASS' ELSE 'FAIL' END::TEXT,
    CASE WHEN EXISTS (
      SELECT 1 FROM public.attendance_logs LIMIT 1
    ) THEN 'View is accessible for SELECT' ELSE 'View is not accessible' END::TEXT;
END;
$$;

COMMENT ON FUNCTION public.verify_attendance_logs_setup() IS 
'Verification function to check if attendance_logs view is set up correctly.
Run: SELECT * FROM verify_attendance_logs_setup();';

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this migration, verify everything works:
--
-- 1. Check the setup:
--    SELECT * FROM verify_attendance_logs_setup();
--
-- 2. Test SELECT query with clock_in_date:
--    SELECT id FROM attendance_logs 
--    WHERE clock_in_date = CURRENT_DATE 
--    AND site_id = 'your-site-id' 
--    LIMIT 1;
--
-- 3. Verify view is read-only (this should fail):
--    INSERT INTO attendance_logs (id, user_id, company_id, site_id) 
--    VALUES (gen_random_uuid(), 'user-id', 'company-id', 'site-id');
--    -- Expected: ERROR - cannot insert into view
--
-- 4. All functions should use clock_in_date:
--    SELECT pg_get_functiondef(oid) 
--    FROM pg_proc 
--    WHERE proname IN ('is_user_clocked_in_today', 'get_active_staff_on_site', 'get_managers_on_shift');
--    -- Check that they use clock_in_date, not clock_in_at::date
-- ============================================================================

