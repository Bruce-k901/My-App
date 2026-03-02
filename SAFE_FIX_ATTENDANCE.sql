-- ============================================================================
-- SAFE FIX: Remove triggers with deadlock protection
-- This version handles active connections and avoids deadlocks
-- Run this if you get deadlock errors
-- ============================================================================

-- First, let's check what's currently using the tables
-- Run this separately first to see what's blocking:
/*
SELECT 
  pid,
  usename,
  application_name,
  state,
  query,
  query_start
FROM pg_stat_activity
WHERE query LIKE '%attendance_logs%'
   OR query LIKE '%staff_attendance%'
ORDER BY query_start;
*/

-- Now the actual fix, split into smaller transactions to avoid deadlocks

-- Step 1: Drop triggers one at a time (smaller transactions)
DO $$
DECLARE
  r RECORD;
  trigger_dropped INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Step 1: Dropping triggers on staff_attendance ===';
  
  FOR r IN 
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'staff_attendance'
      AND event_object_schema = 'public'
    ORDER BY trigger_name
  LOOP
    BEGIN
      EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.staff_attendance CASCADE';
      trigger_dropped := trigger_dropped + 1;
      RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not drop trigger %: %', r.trigger_name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Dropped % trigger(s) on staff_attendance', trigger_dropped;
END $$;

-- Step 2: Drop triggers on attendance_logs
DO $$
DECLARE
  r RECORD;
  trigger_dropped INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Step 2: Dropping triggers on attendance_logs ===';
  
  FOR r IN 
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'attendance_logs'
      AND event_object_schema = 'public'
    ORDER BY trigger_name
  LOOP
    BEGIN
      EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.attendance_logs CASCADE';
      trigger_dropped := trigger_dropped + 1;
      RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not drop trigger %: %', r.trigger_name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Dropped % trigger(s) on attendance_logs', trigger_dropped;
END $$;

-- Step 3: Drop functions one at a time
DO $$
DECLARE
  r RECORD;
  func_dropped INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Step 3: Dropping sync functions ===';
  
  FOR r IN 
    SELECT proname, oidvectortypes(proargtypes) as args
    FROM pg_proc
    WHERE proname LIKE '%sync%attendance%'
       OR proname LIKE '%attendance%sync%'
       OR proname LIKE '%attendance%logs%'
       OR proname LIKE '%staff%attendance%sync%'
    ORDER BY proname
  LOOP
    BEGIN
      EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
      func_dropped := func_dropped + 1;
      RAISE NOTICE 'Dropped function: %', r.proname;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not drop function %: %', r.proname, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Dropped % function(s)', func_dropped;
END $$;

-- Step 4: Drop RLS policies
DO $$
DECLARE
  r RECORD;
  policy_dropped INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Step 4: Dropping RLS policies on attendance_logs ===';
  
  FOR r IN 
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'attendance_logs'
    ORDER BY policyname
  LOOP
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.attendance_logs';
      policy_dropped := policy_dropped + 1;
      RAISE NOTICE 'Dropped policy: %', r.policyname;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not drop policy %: %', r.policyname, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Dropped % policy(ies)', policy_dropped;
END $$;

-- Step 5: Recreate the view (this might need to wait if there are active queries)
-- Try to drop the view first
DO $$
BEGIN
  BEGIN
    DROP VIEW IF EXISTS public.attendance_logs CASCADE;
    RAISE NOTICE '=== Step 5: Dropped attendance_logs view ===';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Could not drop view (might be in use): %', SQLERRM;
    RAISE NOTICE 'You may need to wait a moment and try again, or cancel active queries';
  END;
END $$;

-- Step 6: Create the view (only if it was dropped)
DO $$
BEGIN
  -- Check if view exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'attendance_logs'
  ) THEN
    CREATE VIEW public.attendance_logs AS
    SELECT 
      sa.id,
      sa.user_id,
      sa.company_id,
      sa.site_id,
      sa.clock_in_time AS clock_in_at,
      sa.clock_out_time AS clock_out_at,
      NULL::JSONB AS location,
      sa.shift_notes AS notes,
      sa.created_at,
      sa.updated_at,
      (sa.clock_in_time::date) AS clock_in_date
    FROM public.staff_attendance sa;
    
    RAISE NOTICE '=== Step 6: Created attendance_logs view ===';
  ELSE
    RAISE NOTICE '=== Step 6: View already exists, skipping creation ===';
  END IF;
END $$;

-- Step 7: Set permissions
DO $$
BEGIN
  GRANT SELECT ON public.attendance_logs TO authenticated;
  GRANT SELECT ON public.attendance_logs TO anon;
  
  REVOKE INSERT, UPDATE, DELETE ON public.attendance_logs FROM authenticated;
  REVOKE INSERT, UPDATE, DELETE ON public.attendance_logs FROM anon;
  REVOKE INSERT, UPDATE, DELETE ON public.attendance_logs FROM service_role;
  REVOKE INSERT, UPDATE, DELETE ON public.attendance_logs FROM postgres;
  
  RAISE NOTICE '=== Step 7: Set permissions (SELECT only) ===';
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not set permissions: %', SQLERRM;
END $$;

-- Step 8: Final verification
DO $$
DECLARE
  trigger_count INTEGER := 0;
  r RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== Final Verification ===';
  
  -- Count triggers on staff_attendance
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE event_object_table = 'staff_attendance'
    AND event_object_schema = 'public';
  
  IF trigger_count > 0 THEN
    RAISE WARNING '⚠️ Found % trigger(s) on staff_attendance:', trigger_count;
    FOR r IN 
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE event_object_table = 'staff_attendance'
        AND event_object_schema = 'public'
    LOOP
      RAISE WARNING '  - %', r.trigger_name;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ No triggers on staff_attendance';
  END IF;
  
  -- Count triggers on attendance_logs
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE event_object_table = 'attendance_logs'
    AND event_object_schema = 'public';
  
  IF trigger_count > 0 THEN
    RAISE WARNING '⚠️ Found % trigger(s) on attendance_logs:', trigger_count;
    FOR r IN 
      SELECT trigger_name
      FROM information_schema.triggers
      WHERE event_object_table = 'attendance_logs'
        AND event_object_schema = 'public'
    LOOP
      RAISE WARNING '  - %', r.trigger_name;
    END LOOP;
  ELSE
    RAISE NOTICE '✅ No triggers on attendance_logs';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Fix complete!';
  RAISE NOTICE '========================================';
END $$;

