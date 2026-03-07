-- Migration: Add indexes for staff_attendance table
-- Priority: HIGH
-- Improves: auto_clock_out_after_closing() and general attendance queries

-- Index for finding currently clocked-in users
-- This is the exact filter used by auto_clock_out_after_closing
-- Note: table uses profile_id, not user_id
CREATE INDEX IF NOT EXISTS idx_staff_attendance_active_shifts
    ON public.staff_attendance(profile_id, clock_in_time)
    WHERE clock_out_time IS NULL AND shift_status = 'on_shift';

-- Index for shift date range queries
CREATE INDEX IF NOT EXISTS idx_staff_attendance_clock_in
    ON public.staff_attendance(clock_in_time DESC);

-- Index for user shift history
CREATE INDEX IF NOT EXISTS idx_staff_attendance_profile_date
    ON public.staff_attendance(profile_id, clock_in_time DESC);

-- Index for site-based shift queries
CREATE INDEX IF NOT EXISTS idx_staff_attendance_site_date
    ON public.staff_attendance(site_id, clock_in_time DESC)
    WHERE site_id IS NOT NULL;
