-- Delete Templates Created with Old "Save & Deploy" Method
-- This script identifies and deletes templates that were created using the old
-- compliance template components that created tasks directly when saving templates.
--
-- These templates should be recreated using the new method (via Templates/Compliance pages)
--
-- WARNING: This will delete templates and their associated data. Review carefully before running.

-- STEP 1: Identify templates created by old compliance components
-- These templates have specific slug patterns or naming conventions

WITH old_compliance_templates AS (
  SELECT 
    id,
    name,
    slug,
    category,
    created_at,
    is_template_library,
    company_id
  FROM task_templates
  WHERE 
    -- Templates with slugs matching old compliance component patterns
    (
      slug LIKE 'fire-alarm-test-%' OR
      slug LIKE 'hot-holding-temps-%' OR
      slug LIKE 'probe-calibration-%' OR
      slug LIKE 'pat-compliance-verify-%' OR
      slug LIKE 'emergency-lighting-test-%' OR
      slug LIKE 'extraction-service-%' OR
      slug LIKE 'sfbb-temperature-checks-%' OR
      -- Also include draft versions
      slug LIKE 'fire-alarm-test-draft-%' OR
      slug LIKE 'hot-holding-temps-draft-%' OR
      slug LIKE 'probe-calibration-draft-%' OR
      slug LIKE 'pat-compliance-verify-draft-%' OR
      slug LIKE 'emergency-lighting-test-draft-%' OR
      slug LIKE 'extraction-service-draft-%' OR
      slug LIKE 'sfbb-temperature-checks-draft-%'
    )
    OR
    -- Templates with names matching old compliance component patterns
    (
      name ILIKE '%Test fire alarms%' OR
      name ILIKE '%Verify hot holding%' OR
      name ILIKE '%Calibrate temperature probes%' OR
      name ILIKE '%Verify PAT Test%' OR
      name ILIKE '%Test emergency lighting%' OR
      name ILIKE '%SFBB Temperature Checks%' OR
      name ILIKE '%Extraction Service%'
    )
    OR
    -- Templates that are library templates with specific categories
    (
      is_template_library = true
      AND category IN ('h_and_s', 'food_safety', 'fire_safety', 'health_and_safety')
      AND (
        asset_type IN ('fire_alarms', 'emergency_lights', 'temperature_probes', 'portable_appliances', 'hot_holding_equipment', 'extraction_equipment')
        OR repeatable_field_name IN ('fire_alarm_call_point', 'emergency_light_location', 'probe_name', 'appliance_name', 'hot_holding_unit', 'extraction_unit')
      )
    )
)
-- Show what will be deleted
SELECT 
  'TEMPLATES TO DELETE' as action,
  COUNT(*) as count,
  array_agg(name ORDER BY created_at) as template_names
FROM old_compliance_templates;

-- STEP 2: Show associated data that will be affected
SELECT 
  'ASSOCIATED TEMPLATE FIELDS' as action,
  COUNT(*) as count
FROM template_fields tf
WHERE tf.template_id IN (
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
    name ILIKE '%Extraction Service%'
);

-- STEP 3: Show tasks created from these templates (for reference - tasks won't be deleted)
SELECT 
  'TASKS FROM THESE TEMPLATES' as action,
  COUNT(*) as task_count,
  COUNT(DISTINCT template_id) as unique_templates
FROM checklist_tasks
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
    name ILIKE '%Extraction Service%'
);

-- ============================================================================
-- ACTUAL DELETION (UNCOMMENT TO EXECUTE)
-- ============================================================================
-- WARNING: Review the counts above before running the deletion!

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
    name ILIKE '%Extraction Service%'
    OR
    (
      is_template_library = true
      AND category IN ('h_and_s', 'food_safety', 'fire_safety', 'health_and_safety')
      AND (
        asset_type IN ('fire_alarms', 'emergency_lights', 'temperature_probes', 'portable_appliances', 'hot_holding_equipment', 'extraction_equipment')
        OR repeatable_field_name IN ('fire_alarm_call_point', 'emergency_light_location', 'probe_name', 'appliance_name', 'hot_holding_unit', 'extraction_unit')
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
  slug LIKE 'temperature-check-%' OR
  slug LIKE 'sfbb-temperature-%' OR
  name ILIKE '%Test fire alarms%' OR
  name ILIKE '%Verify hot holding%' OR
  name ILIKE '%Calibrate temperature probes%' OR
  name ILIKE '%Verify PAT Test%' OR
  name ILIKE '%Test emergency lighting%' OR
  name ILIKE '%SFBB Temperature Checks%' OR
  name ILIKE '%Extraction Service%'
  OR
  (
    is_template_library = true
    AND category IN ('h_and_s', 'food_safety', 'fire_safety', 'health_and_safety')
    AND (
      asset_type IN ('fire_alarms', 'emergency_lights', 'temperature_probes', 'portable_appliances', 'hot_holding_equipment', 'extraction_equipment')
      OR repeatable_field_name IN ('fire_alarm_call_point', 'emergency_light_location', 'probe_name', 'appliance_name', 'hot_holding_unit', 'extraction_unit')
    )
  );
*/

-- ============================================================================
-- ALTERNATIVE: Delete by company_id (if you want to be more specific)
-- ============================================================================
-- Replace 'YOUR_COMPANY_ID' with your actual company_id UUID

/*
-- Show templates for specific company
SELECT 
  id,
  name,
  slug,
  category,
  created_at,
  company_id
FROM task_templates
WHERE company_id = 'YOUR_COMPANY_ID'::uuid
  AND (
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
    slug LIKE 'sfbb-temperature-checks-draft-%'
  )
ORDER BY created_at DESC;
*/

