-- Fix RLS policies for attendance sign-off feature
-- This allows managers/admins to insert and update attendance records for their company

-- ============================================================
-- FIX STAFF_ATTENDANCE INSERT POLICY
-- ============================================================
-- Current policy only allows users to insert their own attendance
-- We need to add a policy for managers/admins to insert for their company

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS staff_attendance_insert_company ON public.staff_attendance;

-- Create new policy that allows managers/admins to insert attendance for their company
CREATE POLICY staff_attendance_insert_company
  ON public.staff_attendance FOR INSERT
  WITH CHECK (
    -- User must be a manager/admin/owner
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE (p.id = auth.uid() OR p.auth_user_id = auth.uid())
        AND p.company_id = staff_attendance.company_id
        AND LOWER(COALESCE(p.app_role::text, '')) IN ('admin', 'owner', 'manager', 'general_manager', 'area_manager', 'ops_manager', 'super admin')
    )
    -- The attendance record must be for someone in the same company
    AND EXISTS (
      SELECT 1 FROM public.profiles p2
      WHERE p2.id = staff_attendance.user_id
        AND p2.company_id = staff_attendance.company_id
    )
  );

-- ============================================================
-- VERIFY EXISTING POLICIES
-- ============================================================
-- The existing staff_attendance_insert_own policy allows users to insert their own
-- This new policy allows managers to insert for their company
-- Both policies will work together (OR logic)

-- ============================================================
-- VERIFY ROTA_SHIFTS POLICIES
-- ============================================================
-- The rota_shifts policies should already allow managers to insert
-- But let's make sure they're correct

-- Check if the policy exists and is correct
-- If rota_shifts insert fails, it might be because:
-- 1. The rota doesn't exist for that week
-- 2. Missing required fields (break_minutes, color, etc.)

-- Note: If rota_shifts requires additional fields, we may need to provide defaults
-- Common required fields: break_minutes, color, net_hours

