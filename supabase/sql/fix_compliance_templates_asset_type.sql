-- Fix Compliance Templates: Add asset_type to enable asset dropdown feature
-- 
-- Issue: Asset dropdown feature requires BOTH repeatable_field_name AND asset_type to be set
-- This script ensures all compliance templates have the correct asset_type values
--
-- Run this script to fix existing templates in the database

-- 1. Fix Fridge/Freezer Temperature Check template
UPDATE public.task_templates
SET asset_type = 'refrigeration_equipment'
WHERE slug = 'fridge-freezer-temperature-check'
  AND company_id IS NULL
  AND asset_type IS NULL;

-- 2. Fix Hot Holding Temperature Verification template  
UPDATE public.task_templates
SET asset_type = 'hot_holding_equipment'
WHERE slug = 'hot_holding_temperature_verification'
  AND company_id IS NULL
  AND asset_type IS NULL;

-- 3. Also check for any other temperature-related templates that might need asset_type
-- Update any templates with 'temperature' in evidence_types and repeatable_field_name set
UPDATE public.task_templates
SET asset_type = COALESCE(
  asset_type,
  CASE 
    WHEN slug LIKE '%fridge%' OR slug LIKE '%freezer%' OR repeatable_field_name LIKE '%fridge%' THEN 'refrigeration_equipment'
    WHEN slug LIKE '%hot%holding%' OR slug LIKE '%hothold%' OR repeatable_field_name LIKE '%hot%holding%' THEN 'hot_holding_equipment'
    WHEN slug LIKE '%probe%' OR slug LIKE '%calibration%' THEN 'probe_thermometer'
    ELSE 'equipment'
  END
)
WHERE 'temperature' = ANY(evidence_types)
  AND repeatable_field_name IS NOT NULL
  AND asset_type IS NULL
  AND company_id IS NULL;

-- Verification: Check which templates now have asset_type set
DO $$
DECLARE
  fridge_count INTEGER;
  hot_holding_count INTEGER;
  total_with_asset_type INTEGER;
BEGIN
  -- Count templates with asset_type set
  SELECT COUNT(*) INTO fridge_count
  FROM public.task_templates
  WHERE slug = 'fridge-freezer-temperature-check'
    AND company_id IS NULL
    AND asset_type IS NOT NULL;
  
  SELECT COUNT(*) INTO hot_holding_count
  FROM public.task_templates
  WHERE slug = 'hot_holding_temperature_verification'
    AND company_id IS NULL
    AND asset_type IS NOT NULL;
  
  SELECT COUNT(*) INTO total_with_asset_type
  FROM public.task_templates
  WHERE 'temperature' = ANY(evidence_types)
    AND repeatable_field_name IS NOT NULL
    AND asset_type IS NOT NULL
    AND company_id IS NULL;
  
  RAISE NOTICE '✅ Fridge/Freezer template: % row(s) with asset_type set', fridge_count;
  RAISE NOTICE '✅ Hot Holding template: % row(s) with asset_type set', hot_holding_count;
  RAISE NOTICE '✅ Total temperature templates with asset_type: %', total_with_asset_type;
  
  IF fridge_count = 0 THEN
    RAISE WARNING '⚠️  Fridge/Freezer template still missing asset_type!';
  END IF;
  
  IF hot_holding_count = 0 THEN
    RAISE WARNING '⚠️  Hot Holding template still missing asset_type!';
  END IF;
END $$;



