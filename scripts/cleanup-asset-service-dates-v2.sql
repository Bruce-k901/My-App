-- ============================================================================
-- SIMPLE FIX: Update Assets with Latest Service Dates
-- ============================================================================
-- This updates assets.last_service_date based on the most recent ppm_service_events
-- ============================================================================

-- Update assets with their most recent service date from ppm_service_events
UPDATE assets
SET 
  last_service_date = latest_service.service_date,
  next_service_date = (latest_service.service_date::date + INTERVAL '6 months')::date
FROM (
  SELECT 
    asset_id,
    MAX(service_date) as service_date
  FROM ppm_service_events
  WHERE service_date IS NOT NULL
  GROUP BY asset_id
) AS latest_service
WHERE assets.id = latest_service.asset_id;

-- Show how many assets were updated
SELECT 
  COUNT(*) as assets_updated,
  COUNT(*) FILTER (WHERE last_service_date IS NOT NULL) as with_service_date,
  COUNT(*) FILTER (WHERE next_service_date IS NOT NULL) as with_next_service,
  MIN(last_service_date) as earliest_service,
  MAX(last_service_date) as latest_service
FROM assets
WHERE id IN (SELECT DISTINCT asset_id FROM ppm_service_events);

-- Verify - show assets with their service dates
SELECT 
  a.id,
  a.name,
  a.last_service_date,
  a.next_service_date,
  CASE 
    WHEN a.next_service_date > CURRENT_DATE THEN '✅ Up to date'
    WHEN a.next_service_date <= CURRENT_DATE THEN '⚠️ Overdue'
    ELSE '❓ No service date'
  END as status
FROM assets a
WHERE a.id IN (SELECT DISTINCT asset_id FROM ppm_service_events)
ORDER BY a.next_service_date NULLS LAST
LIMIT 20;

-- ============================================================================
-- EXPLANATION
-- ============================================================================
-- This script finds the most recent service date for each asset from 
-- ppm_service_events and updates the assets table accordingly.
--
-- Why this works:
-- - ppm_service_events contains the actual service records
-- - We find the MAX(service_date) for each asset
-- - Update assets.last_service_date with that date
-- - Calculate next_service_date as last_service_date + 6 months
-- - Edge Function checks assets table, so this prevents duplicates
--
-- Going forward:
-- - The updated ppm.ts will update assets table when PPM completed
-- - This cleanup syncs existing historical data
-- ============================================================================
