-- ============================================================================
-- Migration: Fix attendance_logs RLS and Views
-- Description: Ensures attendance_logs has proper RLS policies and views
--              that work with Supabase REST API (no date casting in filters)
-- ============================================================================

BEGIN;

-- Ensure attendance_logs has proper RLS policies
-- Drop existing policies first
DROP POLICY IF EXISTS attendance_logs_select_own ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_logs_select_company ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_logs_insert_own ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_logs_update_own ON public.attendance_logs;

-- Recreate RLS policies
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Staff can view their own attendance records
CREATE POLICY attendance_logs_select_own
  ON public.attendance_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.id = attendance_logs.user_id
    )
  );

-- Managers and admins can view all attendance in their company
CREATE POLICY attendance_logs_select_company
  ON public.attendance_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.company_id = attendance_logs.company_id
      AND p.app_role IN ('Manager', 'General Manager', 'Admin', 'Owner')
    )
  );

-- Staff can insert their own attendance records
CREATE POLICY attendance_logs_insert_own
  ON public.attendance_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.id = attendance_logs.user_id
      AND p.company_id = attendance_logs.company_id
    )
  );

-- Staff can update their own attendance records
CREATE POLICY attendance_logs_update_own
  ON public.attendance_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.id = attendance_logs.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.id = attendance_logs.user_id
    )
  );

-- Create a computed column for date filtering (REST API friendly)
-- This allows filtering by date without using ::date cast
ALTER TABLE public.attendance_logs 
ADD COLUMN IF NOT EXISTS clock_in_date DATE 
GENERATED ALWAYS AS (clock_in_at::date) STORED;

-- Create index on the computed date column for performance
CREATE INDEX IF NOT EXISTS idx_attendance_logs_clock_in_date 
ON public.attendance_logs(clock_in_date);

-- Create a view for today's attendance that works with REST API
DROP VIEW IF EXISTS public.todays_attendance_logs CASCADE;

CREATE VIEW public.todays_attendance_logs AS
SELECT 
  al.*
FROM public.attendance_logs al
WHERE al.clock_in_date = CURRENT_DATE;

-- Grant access to the view
GRANT SELECT ON public.todays_attendance_logs TO authenticated;
GRANT SELECT ON public.todays_attendance_logs TO anon;

-- Create a view for active shifts (no date cast needed)
DROP VIEW IF EXISTS public.active_attendance_logs CASCADE;

CREATE VIEW public.active_attendance_logs AS
SELECT 
  al.*
FROM public.attendance_logs al
WHERE al.clock_out_at IS NULL;

-- Grant access to the view
GRANT SELECT ON public.active_attendance_logs TO authenticated;
GRANT SELECT ON public.active_attendance_logs TO anon;

COMMIT;

-- Note: These views provide REST API-friendly ways to query attendance
-- without using PostgreSQL date casting syntax that REST API doesn't support.

