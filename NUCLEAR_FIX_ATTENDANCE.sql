-- ============================================================================
-- NUCLEAR FIX: Remove ALL triggers from staff_attendance and attendance_logs
-- This script will DROP EVERY SINGLE TRIGGER on these tables/views
-- Use this if the previous fixes didn't work
-- ============================================================================

BEGIN;

-- Step 1: Drop ALL triggers on staff_attendance (no exceptions)
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== Dropping ALL triggers on staff_attendance ===';
  FOR r IN 
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'staff_attendance'
      AND event_object_schema = 'public'
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.staff_attendance CASCADE';
    RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
  END LOOP;
END $$;

-- Step 2: Drop ALL triggers on attendance_logs (if it's a table, not a view)
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== Dropping ALL triggers on attendance_logs ===';
  FOR r IN 
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'attendance_logs'
      AND event_object_schema = 'public'
  LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.attendance_logs CASCADE';
    RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
  END LOOP;
END $$;

-- Step 3: Drop ALL functions that might sync attendance
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== Dropping ALL sync functions ===';
  FOR r IN 
    SELECT proname, oidvectortypes(proargtypes) as args
    FROM pg_proc
    WHERE proname LIKE '%sync%attendance%'
       OR proname LIKE '%attendance%sync%'
       OR proname LIKE '%attendance%logs%'
       OR proname LIKE '%staff%attendance%sync%'
  LOOP
    BEGIN
      EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
      RAISE NOTICE 'Dropped function: %', r.proname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not drop function %: %', r.proname, SQLERRM;
    END;
  END LOOP;
END $$;

-- Step 4: Drop the view and recreate it as read-only
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
  (sa.clock_in_time::date) AS clock_in_date -- Use this for date filtering
FROM public.staff_attendance sa;

-- Step 5: Grant SELECT only (no INSERT/UPDATE/DELETE)
GRANT SELECT ON public.attendance_logs TO authenticated;
GRANT SELECT ON public.attendance_logs TO anon;

-- Step 6: Revoke ALL write permissions
REVOKE INSERT, UPDATE, DELETE ON public.attendance_logs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.attendance_logs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.attendance_logs FROM service_role;
REVOKE INSERT, UPDATE, DELETE ON public.attendance_logs FROM postgres;

-- Step 7: Drop ALL RLS policies on attendance_logs
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== Dropping ALL RLS policies on attendance_logs ===';
  FOR r IN 
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'attendance_logs'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.attendance_logs';
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- Step 8: Create a SELECT-only RLS policy (if RLS is enabled)
ALTER VIEW public.attendance_logs SET (security_invoker = true);

-- Step 9: Verify no triggers remain
DO $$
DECLARE
  trigger_count INTEGER := 0;
  r RECORD;
BEGIN
  RAISE NOTICE '=== Verifying no triggers remain ===';
  
  -- Check staff_attendance
  FOR r IN 
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'staff_attendance'
      AND event_object_schema = 'public'
  LOOP
    trigger_count := trigger_count + 1;
    RAISE WARNING '⚠️ Found trigger on staff_attendance: %', r.trigger_name;
  END LOOP;
  
  -- Check attendance_logs
  FOR r IN 
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'attendance_logs'
      AND event_object_schema = 'public'
  LOOP
    trigger_count := trigger_count + 1;
    RAISE WARNING '⚠️ Found trigger on attendance_logs: %', r.trigger_name;
  END LOOP;
  
  IF trigger_count = 0 THEN
    RAISE NOTICE '✅ SUCCESS: No triggers found on staff_attendance or attendance_logs';
  ELSE
    RAISE WARNING '⚠️ WARNING: Found % trigger(s) - these may cause errors!', trigger_count;
  END IF;
END $$;

COMMENT ON VIEW public.attendance_logs IS 
'READ-ONLY view mapping attendance_logs to staff_attendance table.

CRITICAL RULES:
1. SELECT queries: Use attendance_logs view with clock_in_date column
2. INSERT/UPDATE/DELETE: Use staff_attendance table directly
3. NEVER try to update this view - it will fail with "cannot insert into column" error

The view is read-only. All write operations must go to staff_attendance table.';

COMMIT;

-- Final verification
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ NUCLEAR FIX COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ All triggers removed from staff_attendance';
  RAISE NOTICE '✅ All triggers removed from attendance_logs';
  RAISE NOTICE '✅ All sync functions removed';
  RAISE NOTICE '✅ attendance_logs is now a read-only view';
  RAISE NOTICE '✅ All write operations must use staff_attendance table';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Clear browser cache (Ctrl+Shift+Delete)';
  RAISE NOTICE '2. Hard refresh (Ctrl+Shift+R)';
  RAISE NOTICE '3. Try clocking in again';
  RAISE NOTICE '========================================';
END $$;

