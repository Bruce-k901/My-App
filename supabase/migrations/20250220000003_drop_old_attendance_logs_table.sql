-- ============================================================================
-- Migration: Drop Old attendance_logs Table
-- Description: Removes the old attendance_logs table and any remaining references
--              All functionality has been migrated to staff_attendance table
-- ============================================================================

BEGIN;

-- Drop any views that reference attendance_logs
DROP VIEW IF EXISTS public.todays_attendance_old CASCADE;
DROP VIEW IF EXISTS public.active_shifts_old CASCADE;

-- Drop any triggers on attendance_logs
DROP TRIGGER IF EXISTS trg_attendance_updated_at ON public.attendance_logs;
DROP TRIGGER IF EXISTS trg_calculate_total_hours_old ON public.attendance_logs;
DROP TRIGGER IF EXISTS trg_prevent_duplicate_active_shifts_old ON public.attendance_logs;

-- Drop any functions that reference attendance_logs (if they weren't updated)
-- Note: These should have been updated in migration 20250220000002, but dropping to be safe
DROP FUNCTION IF EXISTS public.is_user_clocked_in_old(UUID, UUID);
DROP FUNCTION IF EXISTS public.get_active_staff_on_site_old(UUID);
DROP FUNCTION IF EXISTS public.get_managers_on_shift_old(UUID, UUID);

-- Drop RLS policies on attendance_logs
DROP POLICY IF EXISTS attendance_select_own ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_select_company ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_insert_own ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_update_own ON public.attendance_logs;

-- Drop indexes on attendance_logs
DROP INDEX IF EXISTS idx_attendance_user_date;
DROP INDEX IF EXISTS idx_attendance_site_date;
DROP INDEX IF EXISTS idx_attendance_company_date;
DROP INDEX IF EXISTS idx_attendance_active;

-- Finally, drop the old table
DROP TABLE IF EXISTS public.attendance_logs CASCADE;

COMMIT;

