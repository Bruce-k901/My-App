-- ============================================================================
-- FIX: Make templates appear on Compliance page
-- WARNING: Review diagnostic results before running!
-- ============================================================================

-- The Compliance page requires:
-- 1. company_id IS NULL (global templates)
-- 2. is_template_library = true (library templates)
-- 3. is_active = true (active templates)

-- STEP 1: Fix templates that have company_id but should be global
-- Uncomment and run if you have templates that should be global:
/*
UPDATE task_templates
SET company_id = NULL
WHERE is_template_library = true
  AND company_id IS NOT NULL
  AND is_active = true;
*/

-- STEP 2: Fix templates that have is_template_library = false but should be true
-- Uncomment and run if you have library templates marked as false:
/*
UPDATE task_templates
SET is_template_library = true
WHERE company_id IS NULL
  AND is_template_library = false
  AND is_active = true;
*/

-- STEP 3: Activate templates that are inactive
-- Uncomment and run if you have inactive templates that should be active:
/*
UPDATE task_templates
SET is_active = true
WHERE company_id IS NULL
  AND is_template_library = true
  AND is_active = false;
*/

-- STEP 4: Combined fix (all three issues at once)
-- Uncomment to fix all compliance template issues:
/*
UPDATE task_templates
SET 
  company_id = NULL,
  is_template_library = true,
  is_active = true
WHERE is_template_library = true  -- Only fix library templates
  AND (
    company_id IS NOT NULL 
    OR is_template_library = false 
    OR is_active = false
  );
*/

-- STEP 5: Verify fix
SELECT 
  'Verification' as info,
  COUNT(*) as compliance_templates_count
FROM task_templates
WHERE company_id IS NULL
  AND is_template_library = true
  AND is_active = true;

