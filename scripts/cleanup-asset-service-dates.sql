-- ============================================================================
-- ONE-TIME CLEANUP: Sync Asset Service Dates from PPM Schedule
-- ============================================================================
-- This updates the assets table with service dates from ppm_schedule
-- to prevent duplicate PPM task generation
-- 
-- IMPORTANT: Run scripts/test-ppm-table.sql first to confirm table name!
-- ============================================================================

-- Update assets table with latest service dates from ppm_schedule
UPDATE assets
SET 
  last_service_date = ppm_schedule.last_service_date,
  next_service_date = ppm_schedule.next_service_date
FROM ppm_schedule
WHERE 
  assets.id = ppm_schedule.asset_id
  AND ppm_schedule.last_service_date IS NOT NULL;

-- Show how many assets were updated
SELECT 
  COUNT(*) as assets_updated,
  COUNT(*) FILTER (WHERE last_service_date IS NOT NULL) as with_service_date,
  COUNT(*) FILTER (WHERE next_service_date IS NOT NULL) as with_next_service
FROM assets
WHERE id IN (SELECT asset_id FROM ppm_schedule WHERE last_service_date IS NOT NULL);

-- Verify the sync worked - show assets with their PPM schedule dates
SELECT 
  a.id,
  a.name,
  a.last_service_date as asset_last_service,
  a.next_service_date as asset_next_service,
  p.last_service_date as ppm_last_service,
  p.next_service_date as ppm_next_service,
  CASE 
    WHEN a.last_service_date = p.last_service_date THEN '✅ Synced'
    ELSE '⚠️ Mismatch'
  END as sync_status
FROM assets a
JOIN ppm_schedule p ON a.id = p.asset_id
WHERE p.last_service_date IS NOT NULL
ORDER BY a.name
LIMIT 20;

-- ============================================================================
-- EXPLANATION
-- ============================================================================
-- This script syncs the service dates from ppm_schedule to assets table.
-- 
-- Why this is needed:
-- - Previously, completing a PPM only updated ppm_schedule
-- - The assets table was never updated
-- - Edge Function checks assets table for overdue PPMs
-- - This caused duplicate task generation
--
-- After running this:
-- - Assets table will have correct service dates
-- - Edge Function will see assets as serviced
-- - No more duplicate PPM tasks (for already serviced assets)
--
-- Going forward:
-- - The updated ppm.ts code will keep both tables in sync
-- - This cleanup is only needed once
-- ============================================================================
