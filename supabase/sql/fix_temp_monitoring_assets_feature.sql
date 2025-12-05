-- ============================================================================
-- Fix Temp Monitoring Templates: Restore Assets Feature
-- ============================================================================
-- Issue: Temp monitoring templates are missing the assets feature
-- Root Cause: Asset selection requires BOTH repeatable_field_name AND asset_type
-- Many temp monitoring templates have repeatable_field_name but asset_type is NULL
-- ============================================================================
-- This script ensures all temperature monitoring templates have asset_type set
-- so the AssetSelectionFeature component will display correctly
-- ============================================================================

-- Step 1: Fix known temperature monitoring templates by slug
UPDATE public.task_templates
SET asset_type = CASE
  WHEN slug = 'fridge-freezer-temperature-check' THEN 'refrigeration_equipment'
  WHEN slug = 'hot_holding_temperature_verification' THEN 'hot_holding_equipment'
  WHEN slug LIKE '%fridge%' OR slug LIKE '%freezer%' THEN 'refrigeration_equipment'
  WHEN slug LIKE '%hot%holding%' OR slug LIKE '%hothold%' THEN 'hot_holding_equipment'
  WHEN slug LIKE '%probe%' OR slug LIKE '%calibration%' THEN 'probe_thermometer'
  ELSE NULL
END
WHERE ('temperature' = ANY(evidence_types))
  AND repeatable_field_name IS NOT NULL
  AND asset_type IS NULL
  AND company_id IS NULL; -- Only fix global templates

-- Step 2: Fix templates by name/description patterns (catch any we missed)
UPDATE public.task_templates
SET asset_type = CASE
  WHEN LOWER(name) LIKE '%fridge%' OR LOWER(name) LIKE '%freezer%' 
    OR LOWER(description) LIKE '%fridge%' OR LOWER(description) LIKE '%freezer%' 
    OR LOWER(repeatable_field_name) LIKE '%fridge%' OR LOWER(repeatable_field_name) LIKE '%freezer%'
    THEN 'refrigeration_equipment'
  WHEN LOWER(name) LIKE '%hot%holding%' OR LOWER(name) LIKE '%hothold%'
    OR LOWER(description) LIKE '%hot%holding%' OR LOWER(description) LIKE '%hothold%'
    OR LOWER(repeatable_field_name) LIKE '%hot%holding%' OR LOWER(repeatable_field_name) LIKE '%hothold%'
    THEN 'hot_holding_equipment'
  WHEN LOWER(name) LIKE '%probe%' OR LOWER(name) LIKE '%calibration%'
    OR LOWER(description) LIKE '%probe%' OR LOWER(description) LIKE '%calibration%'
    THEN 'probe_thermometer'
  ELSE 'equipment' -- Generic fallback for any other temperature templates
END
WHERE ('temperature' = ANY(evidence_types))
  AND repeatable_field_name IS NOT NULL
  AND asset_type IS NULL
  AND company_id IS NULL; -- Only fix global templates

-- Step 3: Verification and Reporting
DO $$
DECLARE
  template_record RECORD;
  fixed_count INTEGER := 0;
  still_missing_count INTEGER := 0;
  total_temp_templates INTEGER := 0;
BEGIN
  -- Count total temperature templates with repeatable_field_name
  SELECT COUNT(*) INTO total_temp_templates
  FROM public.task_templates
  WHERE 'temperature' = ANY(evidence_types)
    AND repeatable_field_name IS NOT NULL
    AND company_id IS NULL;
  
  -- Count templates that now have asset_type set
  SELECT COUNT(*) INTO fixed_count
  FROM public.task_templates
  WHERE 'temperature' = ANY(evidence_types)
    AND repeatable_field_name IS NOT NULL
    AND asset_type IS NOT NULL
    AND company_id IS NULL;
  
  -- Count templates still missing asset_type
  SELECT COUNT(*) INTO still_missing_count
  FROM public.task_templates
  WHERE 'temperature' = ANY(evidence_types)
    AND repeatable_field_name IS NOT NULL
    AND asset_type IS NULL
    AND company_id IS NULL;
  
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Temp Monitoring Templates Assets Feature Fix - Results';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Total temp monitoring templates (with repeatable_field_name): %', total_temp_templates;
  RAISE NOTICE 'Templates with asset_type set (assets feature enabled): %', fixed_count;
  RAISE NOTICE 'Templates still missing asset_type: %', still_missing_count;
  RAISE NOTICE '';
  
  -- List all fixed templates
  RAISE NOTICE '✅ Templates with assets feature enabled:';
  FOR template_record IN
    SELECT slug, name, asset_type, repeatable_field_name
    FROM public.task_templates
    WHERE 'temperature' = ANY(evidence_types)
      AND repeatable_field_name IS NOT NULL
      AND asset_type IS NOT NULL
      AND company_id IS NULL
    ORDER BY slug
  LOOP
    RAISE NOTICE '   - % (slug: %, asset_type: %, repeatable_field: %)', 
      template_record.name, 
      template_record.slug, 
      template_record.asset_type,
      template_record.repeatable_field_name;
  END LOOP;
  
  -- List any templates still missing asset_type
  IF still_missing_count > 0 THEN
    RAISE WARNING '';
    RAISE WARNING '⚠️  Templates still missing asset_type (assets feature will NOT show):';
    FOR template_record IN
      SELECT slug, name, repeatable_field_name
      FROM public.task_templates
      WHERE 'temperature' = ANY(evidence_types)
        AND repeatable_field_name IS NOT NULL
        AND asset_type IS NULL
        AND company_id IS NULL
      ORDER BY slug
    LOOP
      RAISE WARNING '   - % (slug: %, repeatable_field: %)', 
        template_record.name, 
        template_record.slug,
        template_record.repeatable_field_name;
    END LOOP;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Fix complete! Assets feature should now be visible for temp monitoring templates.';
  RAISE NOTICE '============================================================================';
END $$;
