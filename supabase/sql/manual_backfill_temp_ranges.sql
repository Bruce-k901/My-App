-- Manual backfill script for temperature ranges
-- Run this if the migration didn't work or you want to re-run it
-- This script handles case variations in category names

-- 1. Freezers first (most specific) - case-insensitive category matching
UPDATE public.assets
SET 
  working_temp_min = -20,
  working_temp_max = -18
WHERE LOWER(TRIM(COALESCE(category, ''))) LIKE '%refrigerat%'
  AND (working_temp_min IS NULL AND working_temp_max IS NULL)
  AND (
    LOWER(COALESCE(name, '')) LIKE '%freezer%' OR
    LOWER(COALESCE(name, '')) LIKE '%blast%' OR
    LOWER(COALESCE(name, '')) LIKE '%frozen%'
  );

-- 2. All other refrigeration assets (catch-all) - case-insensitive
-- This will set 0-5°C for ALL refrigeration assets that don't have ranges yet
UPDATE public.assets
SET 
  working_temp_min = 0,
  working_temp_max = 5
WHERE LOWER(TRIM(COALESCE(category, ''))) LIKE '%refrigerat%'
  AND (working_temp_min IS NULL AND working_temp_max IS NULL);

-- 3. Hot-holding equipment - case-insensitive, handles "Cooking & Prep" etc
UPDATE public.assets
SET 
  working_temp_min = 63,
  working_temp_max = NULL
WHERE (LOWER(TRIM(COALESCE(category, ''))) LIKE '%cooking%' 
    OR LOWER(TRIM(COALESCE(category, ''))) LIKE '%prep%')
  AND (working_temp_min IS NULL AND working_temp_max IS NULL)
  AND (
    LOWER(COALESCE(name, '')) LIKE '%hot%' OR
    LOWER(COALESCE(name, '')) LIKE '%bain%' OR
    LOWER(COALESCE(name, '')) LIKE '%holding%' OR
    LOWER(COALESCE(name, '')) LIKE '%display%' OR
    LOWER(COALESCE(name, '')) LIKE '%warmer%'
  );

-- Show summary of what was updated
SELECT 
  category,
  COUNT(*) as total_assets,
  COUNT(working_temp_min) as assets_with_temp_ranges,
  COUNT(*) - COUNT(working_temp_min) as assets_without_temp_ranges
FROM public.assets
WHERE archived = false OR archived IS NULL
GROUP BY category
ORDER BY category;

