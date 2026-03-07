-- Cleanup: Remove orphan training channels created by failed notification attempts
-- and clear Vicky Thomas's active assignments for clean retest

-- 1. Delete messages in orphan "Training: ..." channels
DELETE FROM messaging_messages
WHERE channel_id IN (
  SELECT id FROM messaging_channels
  WHERE name LIKE 'Training:%'
    AND is_auto_created = true
);

-- 2. Delete members of orphan "Training: ..." channels
DELETE FROM messaging_channel_members
WHERE channel_id IN (
  SELECT id FROM messaging_channels
  WHERE name LIKE 'Training:%'
    AND is_auto_created = true
);

-- 3. Delete the orphan channels themselves
DELETE FROM messaging_channels
WHERE name LIKE 'Training:%'
  AND is_auto_created = true;

-- 4. Clear Vicky Thomas's active course assignments for re-testing
-- Profile ID: b7e28f87-fee8-4ca9-bad2-b5ac003acb62
UPDATE course_assignments
SET status = 'expired'
WHERE profile_id = 'b7e28f87-fee8-4ca9-bad2-b5ac003acb62'
  AND status IN ('invited', 'confirmed', 'in_progress');
