-- ============================================================================
-- FIX: Company Library Templates
-- Library templates should be GLOBAL (company_id IS NULL), not company-specific
-- ============================================================================

-- STEP 1: See what company library templates exist
SELECT 
  'Company Library Templates to Fix' as section,
  id,
  name,
  company_id,
  is_template_library,
  is_active,
  frequency
FROM task_templates
WHERE is_template_library = true
  AND company_id IS NOT NULL;

-- STEP 2: OPTION A - Make them global (set company_id to NULL)
-- Uncomment to run:
/*
UPDATE task_templates
SET company_id = NULL
WHERE is_template_library = true
  AND company_id IS NOT NULL;
*/

-- STEP 3: OPTION B - Deactivate them (if they shouldn't exist)
-- Uncomment to run:
/*
UPDATE task_templates
SET is_active = false
WHERE is_template_library = true
  AND company_id IS NOT NULL;
*/

-- STEP 4: OPTION C - Delete them completely
-- WARNING: This will also delete all tasks created from these templates
-- Uncomment to run:
/*
DELETE FROM task_templates
WHERE is_template_library = true
  AND company_id IS NOT NULL;
*/

-- STEP 5: Delete tasks from company library templates
-- Uncomment to run:
/*
DELETE FROM checklist_tasks
WHERE template_id IN (
  SELECT id FROM task_templates
  WHERE is_template_library = true
    AND company_id IS NOT NULL
);
*/

