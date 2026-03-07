-- Add source tracking to attendance tables to distinguish app vs POS clock-in/out
-- Also add pos_timecard_id for idempotent Square timecard sync

-- staff_attendance
ALTER TABLE staff_attendance ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'app';
ALTER TABLE staff_attendance ADD COLUMN IF NOT EXISTS pos_timecard_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_attendance_pos_timecard
  ON staff_attendance(company_id, pos_timecard_id) WHERE pos_timecard_id IS NOT NULL;

-- time_entries
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'app';
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS pos_timecard_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_time_entries_pos_timecard
  ON time_entries(company_id, pos_timecard_id) WHERE pos_timecard_id IS NOT NULL;
