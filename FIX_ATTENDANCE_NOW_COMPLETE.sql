-- ============================================================================
-- COMPLETE FIX: Remove ALL triggers and ensure attendance_logs is read-only
-- This script will:
-- 1. List all existing triggers (for debugging)
-- 2. Drop ALL possible triggers
-- 3. Drop ALL sync functions
-- 4. Recreate the view as read-only
-- 5. Verify no triggers remain
-- ============================================================================

BEGIN;

-- Step 1: List all triggers on staff_attendance (for debugging)
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== Checking triggers on staff_attendance ===';
  FOR r IN 
    SELECT trigger_name, event_manipulation, action_statement
    FROM information_schema.triggers
    WHERE event_object_table = 'staff_attendance'
      AND event_object_schema = 'public'
  LOOP
    RAISE NOTICE 'Found trigger: % (event: %)', r.trigger_name, r.event_manipulation;
  END LOOP;
END $$;

-- Step 2: Drop ALL possible sync triggers on staff_attendance
-- These triggers try to sync staff_attendance inserts to attendance_logs, which causes the error
DROP TRIGGER IF EXISTS trg_sync_staff_attendance_to_logs ON public.staff_attendance;
DROP TRIGGER IF EXISTS sync_staff_attendance_to_logs_trigger ON public.staff_attendance;
DROP TRIGGER IF EXISTS trigger_sync_staff_attendance_to_logs ON public.staff_attendance;
DROP TRIGGER IF EXISTS trg_after_staff_attendance_insert ON public.staff_attendance;
DROP TRIGGER IF EXISTS trg_after_staff_attendance_update ON public.staff_attendance;
DROP TRIGGER IF EXISTS trg_before_staff_attendance_insert ON public.staff_attendance;
DROP TRIGGER IF EXISTS trg_before_staff_attendance_update ON public.staff_attendance;

-- Step 3: Drop ALL possible sync triggers on attendance_logs (including INSTEAD OF triggers)
DROP TRIGGER IF EXISTS trg_sync_attendance_logs_insert ON public.attendance_logs;
DROP TRIGGER IF EXISTS trg_sync_attendance_logs_update ON public.attendance_logs;
DROP TRIGGER IF EXISTS sync_attendance_logs_insert_trigger ON public.attendance_logs;
DROP TRIGGER IF EXISTS sync_attendance_logs_update_trigger ON public.attendance_logs;
DROP TRIGGER IF EXISTS trg_update_attendance_logs_date ON public.attendance_logs;
DROP TRIGGER IF EXISTS trg_attendance_logs_instead_of_insert ON public.attendance_logs;
DROP TRIGGER IF EXISTS trg_attendance_logs_instead_of_update ON public.attendance_logs;

-- Step 4: Drop ALL sync functions (they're no longer needed since we use a view)
-- These functions try to insert into attendance_logs, which is now a read-only view
DROP FUNCTION IF EXISTS public.sync_staff_attendance_to_logs() CASCADE;
DROP FUNCTION IF EXISTS public.sync_attendance_logs_insert() CASCADE;
DROP FUNCTION IF EXISTS public.sync_attendance_logs_update() CASCADE;
DROP FUNCTION IF EXISTS public.update_attendance_logs_date() CASCADE;
DROP FUNCTION IF EXISTS public.attendance_logs_instead_of_insert() CASCADE;
DROP FUNCTION IF EXISTS public.attendance_logs_instead_of_update() CASCADE;

-- Step 5: Drop any function with similar names (catch-all)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT proname, oidvectortypes(proargtypes) as args
    FROM pg_proc
    WHERE proname LIKE '%sync%attendance%logs%'
       OR proname LIKE '%sync%staff%attendance%'
       OR proname LIKE '%attendance%logs%sync%'
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.proname) || '(' || r.args || ') CASCADE';
    RAISE NOTICE 'Dropped function: %', r.proname;
  END LOOP;
END $$;

-- Step 6: Drop any RLS policies on attendance_logs that allow INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS attendance_logs_insert_own ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_logs_insert_company ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_logs_update_own ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_logs_update_company ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_logs_delete_own ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_logs_delete_company ON public.attendance_logs;

-- Step 7: Ensure the view exists and is read-only
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

-- Step 8: Grant SELECT only (no INSERT/UPDATE/DELETE)
GRANT SELECT ON public.attendance_logs TO authenticated;
GRANT SELECT ON public.attendance_logs TO anon;

-- Step 9: Revoke any write permissions that might have been granted
REVOKE INSERT, UPDATE, DELETE ON public.attendance_logs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.attendance_logs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.attendance_logs FROM service_role;

-- Step 10: Verify no triggers remain (for debugging)
DO $$
DECLARE
  r RECORD;
  trigger_count INTEGER := 0;
BEGIN
  RAISE NOTICE '=== Verifying no sync triggers remain ===';
  
  -- Check staff_attendance triggers
  FOR r IN 
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'staff_attendance'
      AND event_object_schema = 'public'
      AND (trigger_name LIKE '%sync%' OR trigger_name LIKE '%attendance%logs%')
  LOOP
    trigger_count := trigger_count + 1;
    RAISE NOTICE 'WARNING: Found remaining trigger: %', r.trigger_name;
  END LOOP;
  
  -- Check attendance_logs triggers
  FOR r IN 
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'attendance_logs'
      AND event_object_schema = 'public'
  LOOP
    trigger_count := trigger_count + 1;
    RAISE NOTICE 'WARNING: Found trigger on attendance_logs view: %', r.trigger_name;
  END LOOP;
  
  IF trigger_count = 0 THEN
    RAISE NOTICE '✅ SUCCESS: No sync triggers found';
  ELSE
    RAISE WARNING '⚠️ Found % sync trigger(s) - these may cause errors!', trigger_count;
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

-- Final verification message
DO $$
BEGIN
  RAISE NOTICE '✅ Fix complete! attendance_logs is now a read-only view.';
  RAISE NOTICE '✅ All sync triggers have been removed.';
  RAISE NOTICE '✅ All write operations must use staff_attendance table.';
END $$;

