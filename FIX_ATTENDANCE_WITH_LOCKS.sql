-- ============================================================================
-- FIX ATTENDANCE WITH LOCK HANDLING
-- This version works around active connections by using lock_timeout
-- ============================================================================

-- Set a short lock timeout so we don't wait forever
SET lock_timeout = '5s';

-- Step 1: Try to disable triggers instead of dropping them (less blocking)
DO $$
DECLARE
  r RECORD;
  disabled_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Step 1: Disabling triggers on staff_attendance ===';
  
  FOR r IN 
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'staff_attendance'
      AND event_object_schema = 'public'
    ORDER BY trigger_name
  LOOP
    BEGIN
      -- Try to disable the trigger first (less blocking than DROP)
      EXECUTE 'ALTER TABLE public.staff_attendance DISABLE TRIGGER ' || quote_ident(r.trigger_name);
      disabled_count := disabled_count + 1;
      RAISE NOTICE 'Disabled trigger: %', r.trigger_name;
    EXCEPTION 
      WHEN lock_not_available THEN
        RAISE WARNING 'Could not disable trigger % (locked): %', r.trigger_name, SQLERRM;
      WHEN OTHERS THEN
        RAISE WARNING 'Could not disable trigger %: %', r.trigger_name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Disabled % trigger(s)', disabled_count;
END $$;

-- Step 2: Now try to drop the disabled triggers (should be easier)
DO $$
DECLARE
  r RECORD;
  dropped_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Step 2: Dropping disabled triggers ===';
  
  FOR r IN 
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'staff_attendance'
      AND event_object_schema = 'public'
    ORDER BY trigger_name
  LOOP
    BEGIN
      EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.staff_attendance CASCADE';
      dropped_count := dropped_count + 1;
      RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
    EXCEPTION 
      WHEN lock_not_available THEN
        RAISE WARNING 'Could not drop trigger % (still locked): %', r.trigger_name, SQLERRM;
        RAISE NOTICE 'You may need to wait for active queries to finish, then run this script again';
      WHEN OTHERS THEN
        RAISE WARNING 'Could not drop trigger %: %', r.trigger_name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Dropped % trigger(s)', dropped_count;
END $$;

-- Step 3: Drop triggers on attendance_logs
DO $$
DECLARE
  r RECORD;
  dropped_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Step 3: Dropping triggers on attendance_logs ===';
  
  FOR r IN 
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'attendance_logs'
      AND event_object_schema = 'public'
    ORDER BY trigger_name
  LOOP
    BEGIN
      EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.attendance_logs CASCADE';
      dropped_count := dropped_count + 1;
      RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
    EXCEPTION 
      WHEN lock_not_available THEN
        RAISE WARNING 'Could not drop trigger % (locked): %', r.trigger_name, SQLERRM;
      WHEN OTHERS THEN
        RAISE WARNING 'Could not drop trigger %: %', r.trigger_name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Dropped % trigger(s)', dropped_count;
END $$;

-- Step 4: Drop functions (these shouldn't be locked)
DO $$
DECLARE
  r RECORD;
  dropped_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Step 4: Dropping sync functions ===';
  
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
      dropped_count := dropped_count + 1;
      RAISE NOTICE 'Dropped function: %', r.proname;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not drop function %: %', r.proname, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Dropped % function(s)', dropped_count;
END $$;

-- Step 5: Drop RLS policies
DO $$
DECLARE
  r RECORD;
  dropped_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Step 5: Dropping RLS policies ===';
  
  FOR r IN 
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'attendance_logs'
    ORDER BY policyname
  LOOP
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.attendance_logs';
      dropped_count := dropped_count + 1;
      RAISE NOTICE 'Dropped policy: %', r.policyname;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not drop policy %: %', r.policyname, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Dropped % policy(ies)', dropped_count;
END $$;

-- Step 6: Recreate view (wait for lock with timeout)
DO $$
BEGIN
  BEGIN
    DROP VIEW IF EXISTS public.attendance_logs CASCADE;
    RAISE NOTICE '=== Step 6: Dropped attendance_logs view ===';
  EXCEPTION 
    WHEN lock_not_available THEN
      RAISE WARNING 'Could not drop view (locked by active query)';
      RAISE NOTICE 'Close any Supabase dashboard tabs viewing the table, wait 10 seconds, then run this script again';
      RETURN;
    WHEN OTHERS THEN
      RAISE WARNING 'Could not drop view: %', SQLERRM;
  END;
  
  -- Create the view
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
  
  RAISE NOTICE 'Created attendance_logs view';
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

-- Reset lock timeout
RESET lock_timeout;

-- Final summary
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fix Summary';
  RAISE NOTICE '========================================';
  
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE event_object_table = 'staff_attendance'
    AND event_object_schema = 'public';
  
  IF trigger_count = 0 THEN
    RAISE NOTICE '✅ All triggers removed from staff_attendance';
  ELSE
    RAISE WARNING '⚠️ % trigger(s) still remain on staff_attendance', trigger_count;
    RAISE NOTICE '   Close Supabase dashboard tabs and run this script again';
  END IF;
  
  RAISE NOTICE '========================================';
END $$;

