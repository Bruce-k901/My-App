-- ============================================================================
-- COMPLETE ATTENDANCE SYSTEM CLEANUP
-- This script removes ALL attendance-related database objects
-- Run this in Supabase SQL Editor to completely clean the database
-- ============================================================================
--
-- ⚠️  IMPORTANT: BEFORE RUNNING THIS SCRIPT ⚠️
-- 
-- 1. Run PRE_FLIGHT_CHECK_BEFORE_CLEANUP.sql FIRST
--    This will check for potential issues and create backups
--
-- 2. Review all warnings and errors from the pre-flight check
--
-- 3. Only proceed if all critical checks pass (or you understand the risks)
--
-- ============================================================================

-- Step 1: Drop ALL triggers on staff_attendance and attendance_logs
DO $$
DECLARE
  r RECORD;
  trigger_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Step 1: Dropping ALL triggers ===';
  
  -- Drop triggers on staff_attendance
  FOR r IN 
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'staff_attendance'
      AND event_object_schema = 'public'
  LOOP
    BEGIN
      EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.staff_attendance CASCADE';
      trigger_count := trigger_count + 1;
      RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not drop trigger %: %', r.trigger_name, SQLERRM;
    END;
  END LOOP;
  
  -- Drop triggers on attendance_logs (if it's a table, not a view)
  FOR r IN 
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'attendance_logs'
      AND event_object_schema = 'public'
  LOOP
    BEGIN
      EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.attendance_logs CASCADE';
      trigger_count := trigger_count + 1;
      RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not drop trigger %: %', r.trigger_name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Dropped % trigger(s)', trigger_count;
END $$;

-- Step 2: Drop ALL functions related to attendance
DROP FUNCTION IF EXISTS public.sync_attendance_logs_insert() CASCADE;
DROP FUNCTION IF EXISTS public.sync_attendance_logs_update() CASCADE;
DROP FUNCTION IF EXISTS public.update_attendance_logs_date() CASCADE;
DROP FUNCTION IF EXISTS public.attendance_logs_instead_of_insert() CASCADE;
DROP FUNCTION IF EXISTS public.attendance_logs_instead_of_update() CASCADE;
DROP FUNCTION IF EXISTS public.prevent_attendance_logs_insert() CASCADE;
DROP FUNCTION IF EXISTS public.trg_sync_attendance_logs_insert() CASCADE;
DROP FUNCTION IF EXISTS public.trg_sync_attendance_logs_update() CASCADE;
DROP FUNCTION IF EXISTS public.trg_update_attendance_logs_date() CASCADE;
DROP FUNCTION IF EXISTS public.trg_attendance_logs_instead_of_insert() CASCADE;
DROP FUNCTION IF EXISTS public.trg_attendance_logs_instead_of_update() CASCADE;

-- Step 3: Drop ALL RLS policies on attendance_logs
DO $$
DECLARE
  r RECORD;
  policy_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Step 3: Dropping ALL RLS policies on attendance_logs ===';
  
  FOR r IN 
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'attendance_logs'
  LOOP
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.attendance_logs';
      policy_count := policy_count + 1;
      RAISE NOTICE 'Dropped policy: %', r.policyname;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not drop policy %: %', r.policyname, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Dropped % policy(ies)', policy_count;
END $$;

-- Step 4: Drop ALL RLS policies on staff_attendance
DO $$
DECLARE
  r RECORD;
  policy_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Step 4: Dropping ALL RLS policies on staff_attendance ===';
  
  FOR r IN 
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'staff_attendance'
  LOOP
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.staff_attendance';
      policy_count := policy_count + 1;
      RAISE NOTICE 'Dropped policy: %', r.policyname;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not drop policy %: %', r.policyname, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE 'Dropped % policy(ies)', policy_count;
END $$;

-- Step 5: Drop the attendance_logs VIEW (if it exists)
DO $$
BEGIN
  DROP VIEW IF EXISTS public.attendance_logs CASCADE;
  RAISE NOTICE '=== Step 5: Dropped attendance_logs view ===';
END $$;

-- Step 6: Drop ALL indexes on staff_attendance
DROP INDEX IF EXISTS public.idx_staff_attendance_user_id;
DROP INDEX IF EXISTS public.idx_staff_attendance_site_id;
DROP INDEX IF EXISTS public.idx_staff_attendance_company_id;
DROP INDEX IF EXISTS public.idx_staff_attendance_clock_in_time;
DROP INDEX IF EXISTS public.idx_staff_attendance_clock_out_time;
DROP INDEX IF EXISTS public.idx_staff_attendance_user_clock_in;
DROP INDEX IF EXISTS public.idx_staff_attendance_active_shifts;

-- Step 7: Drop the staff_attendance TABLE (if you want to completely remove it)
-- WARNING: This will delete ALL attendance data!
-- Uncomment the next line if you want to delete the table entirely:
-- DROP TABLE IF EXISTS public.staff_attendance CASCADE;

-- Step 8: Revoke all grants (only if objects exist)
DO $$
BEGIN
  -- Revoke grants on attendance_logs (if it exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public' AND table_name = 'attendance_logs'
  ) OR EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'attendance_logs'
  ) THEN
    REVOKE ALL ON public.attendance_logs FROM authenticated;
    REVOKE ALL ON public.attendance_logs FROM anon;
    REVOKE ALL ON public.attendance_logs FROM service_role;
    RAISE NOTICE 'Revoked grants on attendance_logs';
  END IF;
  
  -- Revoke grants on staff_attendance (if it exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'staff_attendance'
  ) THEN
    REVOKE ALL ON public.staff_attendance FROM authenticated;
    REVOKE ALL ON public.staff_attendance FROM anon;
    REVOKE ALL ON public.staff_attendance FROM service_role;
    RAISE NOTICE 'Revoked grants on staff_attendance';
  END IF;
END $$;

-- Step 9: Verify cleanup
DO $$
DECLARE
  trigger_count INTEGER;
  policy_count INTEGER;
  view_exists BOOLEAN;
  table_exists BOOLEAN;
BEGIN
  RAISE NOTICE '=== Step 9: Verification ===';
  
  -- Check triggers
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE event_object_table IN ('staff_attendance', 'attendance_logs')
    AND event_object_schema = 'public';
  
  -- Check policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('staff_attendance', 'attendance_logs');
  
  -- Check if view exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name = 'attendance_logs'
  ) INTO view_exists;
  
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'staff_attendance'
  ) INTO table_exists;
  
  RAISE NOTICE 'Remaining triggers: %', trigger_count;
  RAISE NOTICE 'Remaining policies: %', policy_count;
  RAISE NOTICE 'attendance_logs view exists: %', view_exists;
  RAISE NOTICE 'staff_attendance table exists: %', table_exists;
  
  IF trigger_count = 0 AND policy_count = 0 AND NOT view_exists THEN
    RAISE NOTICE '✅ SUCCESS: All attendance objects cleaned up!';
  ELSE
    RAISE WARNING '⚠️ Some objects may still exist. Check the counts above.';
  END IF;
END $$;

-- ============================================================================
-- CLEANUP COMPLETE
-- 
-- If you want to completely remove the staff_attendance table (and all data),
-- uncomment the DROP TABLE statement in Step 7 above.
-- 
-- To rebuild the attendance system, you'll need to:
-- 1. Create the staff_attendance table (if dropped)
-- 2. Create indexes
-- 3. Create RLS policies
-- 4. Create the attendance_logs view (if needed)
-- ============================================================================

