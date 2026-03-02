-- Clear active course assignments for Vicky Thomas to allow re-testing
-- Profile ID: b7e28f87-fee8-4ca9-bad2-b5ac003acb62

UPDATE course_assignments
SET status = 'expired'
WHERE profile_id = 'b7e28f87-fee8-4ca9-bad2-b5ac003acb62'
  AND status IN ('invited', 'confirmed', 'in_progress');
