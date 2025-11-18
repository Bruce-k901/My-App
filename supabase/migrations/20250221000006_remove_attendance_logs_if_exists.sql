-- ============================================================================
-- Migration: Remove attendance_logs Table If It Still Exists
-- Description: Drops attendance_logs table if it exists to prevent 406 errors
--              All functionality has been migrated to staff_attendance
-- ============================================================================

BEGIN;

-- Check if attendance_logs table exists and drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'attendance_logs'
  ) THEN
    -- Drop any views that reference attendance_logs
    DROP VIEW IF EXISTS public.todays_attendance_logs_view CASCADE;
    DROP VIEW IF EXISTS public.active_attendance_logs_view CASCADE;
    
    -- Drop any triggers on attendance_logs
    DROP TRIGGER IF EXISTS trg_update_attendance_logs_date ON public.attendance_logs;
    
    -- Drop any functions that reference attendance_logs
    DROP FUNCTION IF EXISTS public.update_attendance_logs_date() CASCADE;
    DROP FUNCTION IF EXISTS public.is_user_clocked_in_today(UUID, UUID, DATE) CASCADE;
    DROP FUNCTION IF EXISTS public.get_attendance_logs_by_date(UUID, DATE, UUID) CASCADE;
    DROP FUNCTION IF EXISTS public.get_active_attendance_logs(UUID, DATE) CASCADE;
    
    -- Drop RLS policies on attendance_logs
    DROP POLICY IF EXISTS attendance_select_own ON public.attendance_logs;
    DROP POLICY IF EXISTS attendance_select_company ON public.attendance_logs;
    DROP POLICY IF EXISTS attendance_insert_own ON public.attendance_logs;
    DROP POLICY IF EXISTS attendance_update_own ON public.attendance_logs;
    DROP POLICY IF EXISTS company_addon_purchases_select_own_company ON public.attendance_logs;
    
    -- Drop indexes on attendance_logs
    DROP INDEX IF EXISTS idx_attendance_logs_clock_in_date;
    DROP INDEX IF EXISTS idx_attendance_logs_user_date;
    DROP INDEX IF EXISTS idx_attendance_logs_site_date;
    
    -- Finally, drop the table
    DROP TABLE IF EXISTS public.attendance_logs CASCADE;
    
    RAISE NOTICE 'Dropped attendance_logs table - all functionality uses staff_attendance';
  ELSE
    RAISE NOTICE 'attendance_logs table does not exist - nothing to drop';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- Note: If you still see 406 errors after this migration:
-- 1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
-- 2. Restart your Next.js dev server
-- 3. All attendance queries should use staff_attendance table via:
--    @/lib/notifications/attendance (recommended)
-- ============================================================================

