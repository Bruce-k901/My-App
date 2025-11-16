-- QUICK DELETE: Old "Save & Deploy" Templates
-- This script quickly identifies and deletes templates created with the old method
-- 
-- IMPORTANT: 
-- 1. Run the SELECT query first to see what will be deleted
-- 2. Replace 'YOUR_COMPANY_ID' with your actual company_id UUID
-- 3. Uncomment the DELETE statements only after reviewing

-- ============================================================================
-- STEP 1: REVIEW - See what templates will be deleted
-- ============================================================================
SELECT 
  id,
  name,
  slug,
  category,
  asset_type,
  repeatable_field_name,
  created_at,
  company_id,
  (SELECT COUNT(*) FROM template_fields WHERE template_id = task_templates.id) as field_count,
  (SELECT COUNT(*) FROM checklist_tasks WHERE template_id = task_templates.id) as task_count
FROM task_templates
WHERE 
  -- Match slug patterns from old compliance components
  (
    slug LIKE 'fire-alarm-test-%' OR
    slug LIKE 'hot-holding-temps-%' OR
    slug LIKE 'probe-calibration-%' OR
    slug LIKE 'pat-compliance-verify-%' OR
    slug LIKE 'emergency-lighting-test-%' OR
    slug LIKE 'extraction-service-%' OR
    slug LIKE 'sfbb-temperature-checks-%' OR
    -- Draft versions
    slug LIKE 'fire-alarm-test-draft-%' OR
    slug LIKE 'hot-holding-temps-draft-%' OR
    slug LIKE 'probe-calibration-draft-%' OR
    slug LIKE 'pat-compliance-verify-draft-%' OR
    slug LIKE 'emergency-lighting-test-draft-%' OR
    slug LIKE 'extraction-service-draft-%' OR
    slug LIKE 'sfbb-temperature-checks-draft-%'
  )
  -- OR match by name patterns
  OR (
    name ILIKE '%Test fire alarms%' OR
    name ILIKE '%Verify hot holding%' OR
    name ILIKE '%Calibrate temperature probes%' OR
    name ILIKE '%Verify PAT Test%' OR
    name ILIKE '%Test emergency lighting%' OR
    name ILIKE '%SFBB Temperature Checks%' OR
    name ILIKE '%Extraction Service%'
  )
  -- OR match by specific characteristics of old compliance templates
  OR (
    is_template_library = true
    AND category IN ('h_and_s', 'food_safety', 'fire_safety', 'health_and_safety')
    AND (
      asset_type IN ('fire_alarms', 'emergency_lights', 'temperature_probes', 'portable_appliances', 'hot_holding_equipment', 'extraction_equipment', 'extraction_systems')
      OR repeatable_field_name IN ('fire_alarm_call_point', 'emergency_light_location', 'probe_name', 'appliance_name', 'hot_holding_unit', 'extraction_unit', 'extraction_system', 'fridge_name')
    )
  )
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 2: DELETE (UNCOMMENT AFTER REVIEWING ABOVE)
-- ============================================================================

/*
-- Delete template fields first (foreign key constraint)
DELETE FROM template_fields
WHERE template_id IN (
  SELECT id FROM task_templates
  WHERE 
    slug LIKE 'fire-alarm-test-%' OR
    slug LIKE 'hot-holding-temps-%' OR
    slug LIKE 'probe-calibration-%' OR
    slug LIKE 'pat-compliance-verify-%' OR
    slug LIKE 'emergency-lighting-test-%' OR
    slug LIKE 'extraction-service-%' OR
    slug LIKE 'sfbb-temperature-checks-%' OR
    slug LIKE 'fire-alarm-test-draft-%' OR
    slug LIKE 'hot-holding-temps-draft-%' OR
    slug LIKE 'probe-calibration-draft-%' OR
    slug LIKE 'pat-compliance-verify-draft-%' OR
    slug LIKE 'emergency-lighting-test-draft-%' OR
    slug LIKE 'extraction-service-draft-%' OR
    slug LIKE 'sfbb-temperature-checks-draft-%' OR
    name ILIKE '%Test fire alarms%' OR
    name ILIKE '%Verify hot holding%' OR
    name ILIKE '%Calibrate temperature probes%' OR
    name ILIKE '%Verify PAT Test%' OR
    name ILIKE '%Test emergency lighting%' OR
    name ILIKE '%SFBB Temperature Checks%' OR
    name ILIKE '%Extraction Service%' OR
    (
      is_template_library = true
      AND category IN ('h_and_s', 'food_safety', 'fire_safety', 'health_and_safety')
      AND (
        asset_type IN ('fire_alarms', 'emergency_lights', 'temperature_probes', 'portable_appliances', 'hot_holding_equipment', 'extraction_equipment', 'extraction_systems')
        OR repeatable_field_name IN ('fire_alarm_call_point', 'emergency_light_location', 'probe_name', 'appliance_name', 'hot_holding_unit', 'extraction_unit', 'extraction_system', 'fridge_name')
      )
    )
);

-- Delete the templates
DELETE FROM task_templates
WHERE 
  slug LIKE 'fire-alarm-test-%' OR
  slug LIKE 'hot-holding-temps-%' OR
  slug LIKE 'probe-calibration-%' OR
  slug LIKE 'pat-compliance-verify-%' OR
  slug LIKE 'emergency-lighting-test-%' OR
  slug LIKE 'extraction-service-%' OR
  slug LIKE 'sfbb-temperature-checks-%' OR
  slug LIKE 'fire-alarm-test-draft-%' OR
  slug LIKE 'hot-holding-temps-draft-%' OR
  slug LIKE 'probe-calibration-draft-%' OR
  slug LIKE 'pat-compliance-verify-draft-%' OR
  slug LIKE 'emergency-lighting-test-draft-%' OR
  slug LIKE 'extraction-service-draft-%' OR
  slug LIKE 'sfbb-temperature-checks-draft-%' OR
  name ILIKE '%Test fire alarms%' OR
  name ILIKE '%Verify hot holding%' OR
  name ILIKE '%Calibrate temperature probes%' OR
  name ILIKE '%Verify PAT Test%' OR
  name ILIKE '%Test emergency lighting%' OR
  name ILIKE '%SFBB Temperature Checks%' OR
  name ILIKE '%Extraction Service%' OR
  (
    is_template_library = true
    AND category IN ('h_and_s', 'food_safety', 'fire_safety', 'health_and_safety')
    AND (
      asset_type IN ('fire_alarms', 'emergency_lights', 'temperature_probes', 'portable_appliances', 'hot_holding_equipment', 'extraction_equipment', 'extraction_systems')
      OR repeatable_field_name IN ('fire_alarm_call_point', 'emergency_light_location', 'probe_name', 'appliance_name', 'hot_holding_unit', 'extraction_unit', 'extraction_system', 'fridge_name')
    )
  );
*/

-- ============================================================================
-- STEP 3: VERIFY DELETION (Run after deletion)
-- ============================================================================
/*
SELECT COUNT(*) as remaining_old_templates
FROM task_templates
WHERE 
  slug LIKE 'fire-alarm-test-%' OR
  slug LIKE 'hot-holding-temps-%' OR
  slug LIKE 'probe-calibration-%' OR
  slug LIKE 'pat-compliance-verify-%' OR
  slug LIKE 'emergency-lighting-test-%' OR
  slug LIKE 'extraction-service-%' OR
  slug LIKE 'sfbb-temperature-checks-%';
-- Should return 0 if deletion was successful
*/







