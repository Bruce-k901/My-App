-- ============================================================
-- ATTENDANCE SIGN-OFF - COMPLETE MIGRATION
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================
--
-- ⚠️ IMPORTANT: app_role ENUM HANDLING
-- The app_role enum must ALWAYS be coalesced and cast to text before comparison
-- Use: LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner', 'manager')
-- This prevents: ERROR: 22P02: invalid input value for enum app_role
-- ============================================================

-- 1. ATTENDANCE ADJUSTMENTS TABLE (Audit Trail)
CREATE TABLE IF NOT EXISTS attendance_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  attendance_id UUID REFERENCES staff_attendance(id) ON DELETE SET NULL,
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  adjustment_date DATE NOT NULL,
  original_clock_in TIMESTAMPTZ,
  original_clock_out TIMESTAMPTZ,
  original_hours DECIMAL(5,2),
  adjusted_clock_in TIMESTAMPTZ,
  adjusted_clock_out TIMESTAMPTZ,
  adjusted_hours DECIMAL(5,2),
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN (
    'time_edit', 'manual_add', 'manual_delete', 'break_edit', 'approved_overtime'
  )),
  reason TEXT NOT NULL,
  adjusted_by UUID NOT NULL REFERENCES profiles(id),
  adjusted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_adj_company ON attendance_adjustments(company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_adj_site ON attendance_adjustments(site_id);
CREATE INDEX IF NOT EXISTS idx_attendance_adj_date ON attendance_adjustments(adjustment_date);
CREATE INDEX IF NOT EXISTS idx_attendance_adj_staff ON attendance_adjustments(staff_id);

ALTER TABLE attendance_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_company_adjustments" ON attendance_adjustments FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "create_adjustments" ON attendance_adjustments FOR INSERT
WITH CHECK (company_id IN (
  SELECT company_id FROM profiles WHERE auth_user_id = auth.uid() 
  AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner', 'manager')
));


-- 2. ATTENDANCE SIGNOFFS TABLE
CREATE TABLE IF NOT EXISTS attendance_signoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  scheduled_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  approved_hours DECIMAL(5,2) NOT NULL,
  signed_off BOOLEAN DEFAULT false,
  signed_off_by UUID REFERENCES profiles(id),
  signed_off_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, site_id, staff_id, shift_date)
);

CREATE INDEX IF NOT EXISTS idx_signoffs_company ON attendance_signoffs(company_id);
CREATE INDEX IF NOT EXISTS idx_signoffs_site ON attendance_signoffs(site_id);
CREATE INDEX IF NOT EXISTS idx_signoffs_date ON attendance_signoffs(shift_date);
CREATE INDEX IF NOT EXISTS idx_signoffs_staff ON attendance_signoffs(staff_id);
CREATE INDEX IF NOT EXISTS idx_signoffs_pending ON attendance_signoffs(site_id, shift_date) WHERE signed_off = false;

ALTER TABLE attendance_signoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_company_signoffs" ON attendance_signoffs FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "manage_signoffs" ON attendance_signoffs FOR ALL
USING (company_id IN (
  SELECT company_id FROM profiles WHERE auth_user_id = auth.uid() 
  AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner', 'manager')
));


-- 3. PAYROLL SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS payroll_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  total_staff INTEGER NOT NULL,
  total_scheduled_hours DECIMAL(7,2),
  total_actual_hours DECIMAL(7,2),
  total_approved_hours DECIMAL(7,2) NOT NULL,
  total_adjustments INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_review', 'approved', 'submitted', 'rejected'
  )),
  submitted_by UUID REFERENCES profiles(id),
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES profiles(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  exported_at TIMESTAMPTZ,
  export_format TEXT,
  export_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, site_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_payroll_company ON payroll_submissions(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_site ON payroll_submissions(site_id);
CREATE INDEX IF NOT EXISTS idx_payroll_week ON payroll_submissions(week_start_date);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll_submissions(status);

ALTER TABLE payroll_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_company_payroll" ON payroll_submissions FOR SELECT
USING (company_id IN (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid()));

CREATE POLICY "manage_payroll" ON payroll_submissions FOR ALL
USING (company_id IN (
  SELECT company_id FROM profiles WHERE auth_user_id = auth.uid() 
  AND LOWER(COALESCE(app_role::text, '')) IN ('admin', 'owner', 'manager')
));


-- 4. EXTEND STAFF_ATTENDANCE TABLE
ALTER TABLE staff_attendance 
ADD COLUMN IF NOT EXISTS manually_adjusted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS adjustment_id UUID REFERENCES attendance_adjustments(id),
ADD COLUMN IF NOT EXISTS payroll_locked BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS signed_off BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS signed_off_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS signed_off_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_attendance_unsigned 
ON staff_attendance(site_id, clock_in_time) 
WHERE signed_off = false AND clock_out_time IS NOT NULL;


-- 5. CREATE VIEW FOR WEEKLY ATTENDANCE REVIEW
-- Enhanced version that includes rota_shifts data for scheduled hours
-- Note: This view joins rota_shifts through rotas to get site_id
CREATE OR REPLACE VIEW weekly_attendance_review AS
SELECT 
  COALESCE(r.site_id, sa.site_id) as site_id,
  COALESCE(rs.company_id, sa.company_id) as company_id,
  COALESCE(rs.profile_id, sa.user_id) as staff_id,
  p.full_name as staff_name,
  p.position_title,
  p.hourly_rate,
  COALESCE(rs.shift_date::text, DATE(sa.clock_in_time)::text) as work_date,
  rs.id as scheduled_shift_id,
  rs.start_time as scheduled_start,
  rs.end_time as scheduled_end,
  CASE 
    WHEN rs.start_time IS NOT NULL AND rs.end_time IS NOT NULL THEN
      EXTRACT(EPOCH FROM (
        (rs.shift_date + rs.end_time::time) - (rs.shift_date + rs.start_time::time)
      )) / 3600.0 - COALESCE(rs.break_minutes, 0) / 60.0
    ELSE NULL
  END as scheduled_hours,
  NULL as shift_status,
  sa.id as attendance_id,
  sa.clock_in_time as actual_clock_in,
  sa.clock_out_time as actual_clock_out,
  sa.total_hours as actual_hours,
  sa.shift_notes,
  sa.manually_adjusted,
  sa.signed_off,
  sa.signed_off_by,
  sa.signed_off_at,
  COALESCE(sa.total_hours, 0) - COALESCE(
    CASE 
      WHEN rs.start_time IS NOT NULL AND rs.end_time IS NOT NULL THEN
        EXTRACT(EPOCH FROM (
          (rs.shift_date + rs.end_time::time) - (rs.shift_date + rs.start_time::time)
        )) / 3600.0 - COALESCE(rs.break_minutes, 0) / 60.0
      ELSE 0
    END, 0
  ) as hours_variance,
  CASE 
    WHEN rs.id IS NOT NULL AND sa.id IS NULL THEN 'missing_attendance'
    WHEN rs.id IS NULL AND sa.id IS NOT NULL THEN 'unscheduled_shift'
    WHEN sa.clock_in_time IS NOT NULL AND rs.start_time IS NOT NULL AND 
         sa.clock_in_time > (rs.shift_date + rs.start_time::time + INTERVAL '15 minutes') THEN 'late_arrival'
    WHEN sa.clock_out_time IS NOT NULL AND rs.end_time IS NOT NULL AND 
         sa.clock_out_time < (rs.shift_date + rs.end_time::time - INTERVAL '15 minutes') THEN 'early_departure'
    ELSE 'normal'
  END as attendance_status
FROM rota_shifts rs
LEFT JOIN rotas r ON r.id = rs.rota_id
FULL OUTER JOIN staff_attendance sa 
  ON rs.profile_id = sa.user_id 
  AND rs.shift_date = DATE(sa.clock_in_time)
  AND r.site_id = sa.site_id
LEFT JOIN profiles p ON p.id = COALESCE(rs.profile_id, sa.user_id)
WHERE sa.clock_out_time IS NOT NULL OR rs.id IS NOT NULL;

-- Enhanced version with scheduled_shifts (if you have a scheduled_shifts or rota_shifts table):
-- Uncomment and modify this if you want to compare scheduled vs actual hours
/*
CREATE OR REPLACE VIEW weekly_attendance_review AS
SELECT 
  COALESCE(ss.site_id, sa.site_id) as site_id,
  COALESCE(ss.company_id, sa.company_id) as company_id,
  COALESCE(ss.staff_id, sa.user_id) as staff_id,
  p.full_name as staff_name,
  p.position_title,
  p.hourly_rate,
  COALESCE(ss.shift_date, DATE(sa.clock_in_time)) as work_date,
  ss.id as scheduled_shift_id,
  ss.start_time as scheduled_start,
  ss.end_time as scheduled_end,
  ss.total_hours as scheduled_hours,
  ss.status as shift_status,
  sa.id as attendance_id,
  sa.clock_in_time as actual_clock_in,
  sa.clock_out_time as actual_clock_out,
  sa.total_hours as actual_hours,
  sa.shift_notes,
  sa.manually_adjusted,
  sa.signed_off,
  sa.signed_off_by,
  sa.signed_off_at,
  COALESCE(sa.total_hours, 0) - COALESCE(ss.total_hours, 0) as hours_variance,
  CASE 
    WHEN ss.id IS NOT NULL AND sa.id IS NULL THEN 'missing_attendance'
    WHEN ss.id IS NULL AND sa.id IS NOT NULL THEN 'unscheduled_shift'
    WHEN sa.clock_in_time > (ss.shift_date + ss.start_time + INTERVAL '15 minutes') THEN 'late_arrival'
    WHEN sa.clock_out_time < (ss.shift_date + ss.end_time - INTERVAL '15 minutes') THEN 'early_departure'
    ELSE 'normal'
  END as attendance_status
FROM scheduled_shifts ss
FULL OUTER JOIN staff_attendance sa 
  ON ss.staff_id = sa.user_id 
  AND ss.site_id = sa.site_id
  AND ss.shift_date = DATE(sa.clock_in_time)
  AND sa.clock_out_time IS NOT NULL
LEFT JOIN profiles p 
  ON p.id = COALESCE(ss.staff_id, sa.user_id)
WHERE 
  (ss.status IN ('published', 'confirmed') OR ss.status IS NULL)
  AND COALESCE(ss.company_id, sa.company_id) IS NOT NULL;
*/

-- Done!
SELECT 'Attendance sign-off tables created successfully!' as result;

