-- SAFE DELETE: Old "Save & Deploy" Templates by Company
-- This script allows you to safely delete old compliance templates for a specific company
-- 
-- USAGE:
-- 1. Replace 'YOUR_COMPANY_ID' with your actual company_id UUID
-- 2. Run the SELECT queries first to review what will be deleted
-- 3. Uncomment the DELETE statements only after reviewing

-- ============================================================================
-- STEP 1: SET YOUR COMPANY ID HERE
-- ============================================================================
DO $$
DECLARE
  v_company_id UUID := 'YOUR_COMPANY_ID'::uuid; -- REPLACE WITH YOUR COMPANY ID
BEGIN
  -- ============================================================================
  -- STEP 2: REVIEW - Show templates that will be deleted
  -- ============================================================================
  RAISE NOTICE '=== TEMPLATES TO DELETE ===';
  
  PERFORM 1 FROM task_templates
  WHERE company_id = v_company_id
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
      slug LIKE 'sfbb-temperature-checks-draft-%' OR
      name ILIKE '%Test fire alarms%' OR
      name ILIKE '%Verify hot holding%' OR
      name ILIKE '%Calibrate temperature probes%' OR
      name ILIKE '%Verify PAT Test%' OR
      name ILIKE '%Test emergency lighting%' OR
      name ILIKE '%SFBB Temperature Checks%' OR
      name ILIKE '%Extraction Service%'
    );
END $$;

-- Show the templates (run this first to review)
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
WHERE company_id = 'YOUR_COMPANY_ID'::uuid  -- REPLACE WITH YOUR COMPANY ID
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
    slug LIKE 'sfbb-temperature-checks-draft-%' OR
    name ILIKE '%Test fire alarms%' OR
    name ILIKE '%Verify hot holding%' OR
    name ILIKE '%Calibrate temperature probes%' OR
    name ILIKE '%Verify PAT Test%' OR
    name ILIKE '%Test emergency lighting%' OR
    name ILIKE '%SFBB Temperature Checks%' OR
    name ILIKE '%Extraction Service%'
  )
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 3: DELETE (UNCOMMENT AFTER REVIEWING ABOVE)
-- ============================================================================

/*
-- Delete template fields first
DELETE FROM template_fields
WHERE template_id IN (
  SELECT id FROM task_templates
  WHERE company_id = 'YOUR_COMPANY_ID'::uuid  -- REPLACE WITH YOUR COMPANY ID
    AND (
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
    )
);

-- Delete the templates
DELETE FROM task_templates
WHERE company_id = 'YOUR_COMPANY_ID'::uuid  -- REPLACE WITH YOUR COMPANY ID
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
    slug LIKE 'sfbb-temperature-checks-draft-%' OR
    name ILIKE '%Test fire alarms%' OR
    name ILIKE '%Verify hot holding%' OR
    name ILIKE '%Calibrate temperature probes%' OR
    name ILIKE '%Verify PAT Test%' OR
    name ILIKE '%Test emergency lighting%' OR
    name ILIKE '%SFBB Temperature Checks%' OR
    name ILIKE '%Extraction Service%'
  );
*/

-- ============================================================================
-- VERIFICATION: Check if deletion was successful
-- ============================================================================
-- Run this after deletion to verify
/*
SELECT 
  COUNT(*) as remaining_templates
FROM task_templates
WHERE company_id = 'YOUR_COMPANY_ID'::uuid  -- REPLACE WITH YOUR COMPANY ID
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
  );
-- Should return 0 if deletion was successful
*/

