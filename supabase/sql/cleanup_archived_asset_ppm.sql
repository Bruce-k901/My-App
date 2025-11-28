-- ============================================================================
-- CLEANUP: Remove PPM schedules and tasks for archived assets
-- ============================================================================
-- This script should be run ONCE to clean up existing data.
-- After running this, the archive_asset.sql trigger will prevent future issues.
-- ============================================================================

-- Step 1: Show what will be deleted (for verification)
SELECT 
  'BEFORE CLEANUP' as status,
  (SELECT COUNT(*) FROM assets WHERE archived = true) as archived_assets_count,
  (SELECT COUNT(*) FROM ppm_schedule WHERE asset_id IN (SELECT id FROM assets WHERE archived = true)) as ppm_schedules_to_delete,
  (SELECT COUNT(*) FROM checklist_tasks 
   WHERE task_data->>'source_type' = 'ppm_service' 
   AND task_data->>'asset_id' IN (SELECT id::text FROM assets WHERE archived = true)) as ppm_tasks_to_delete;

-- Step 2: Delete PPM schedules for archived assets
DELETE FROM ppm_schedule
WHERE asset_id IN (
  SELECT id FROM assets WHERE archived = true
);

-- Step 3: Delete any existing checklist_tasks for archived assets' PPMs
-- (These are the tasks that appear in "Today's Tasks")
DELETE FROM checklist_tasks
WHERE task_data->>'source_type' = 'ppm_service'
  AND task_data->>'asset_id' IN (
    SELECT id::text FROM assets WHERE archived = true
  );

-- Step 4: Show results
SELECT 
  'AFTER CLEANUP' as status,
  (SELECT COUNT(*) FROM assets WHERE archived = true) as archived_assets_count,
  (SELECT COUNT(*) FROM ppm_schedule WHERE asset_id IN (SELECT id FROM assets WHERE archived = true)) as remaining_ppm_schedules,
  (SELECT COUNT(*) FROM checklist_tasks 
   WHERE task_data->>'source_type' = 'ppm_service' 
   AND task_data->>'asset_id' IN (SELECT id::text FROM assets WHERE archived = true)) as remaining_ppm_tasks;

-- Note: After running this, make sure to deploy archive_asset.sql
-- which contains the trigger that will automatically remove PPM schedules
-- when assets are archived in the future.

