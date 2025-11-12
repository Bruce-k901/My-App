-- ============================================================================
-- FIND AND DEACTIVATE "Check refuse storage area cleanliness" TEMPLATE
-- This template is coming from EHO compliance checklist import
-- ============================================================================

-- STEP 1: Find the template
SELECT 
  'Template Found' as check_type,
  id,
  name,
  slug,
  company_id,
  frequency,
  is_active,
  is_template_library,
  dayparts,
  time_of_day,
  created_at
FROM task_templates
WHERE name ILIKE '%refuse storage%'
   OR slug ILIKE '%refuse%';

-- STEP 2: Check how many tasks it has created
SELECT 
  'Tasks Created by Template' as check_type,
  tt.id as template_id,
  tt.name as template_name,
  COUNT(ct.id) as total_tasks,
  COUNT(CASE WHEN ct.due_date = CURRENT_DATE THEN 1 END) as today_tasks,
  COUNT(CASE WHEN ct.due_date >= CURRENT_DATE THEN 1 END) as future_tasks,
  MIN(ct.due_date) as earliest_task,
  MAX(ct.due_date) as latest_task
FROM task_templates tt
LEFT JOIN checklist_tasks ct ON ct.template_id = tt.id
WHERE tt.name ILIKE '%refuse storage%'
GROUP BY tt.id, tt.name;

-- STEP 3: DEACTIVATE the template (uncomment to run)
/*
UPDATE task_templates
SET is_active = false
WHERE name ILIKE '%refuse storage%'
   OR slug ILIKE '%refuse%';
*/

-- STEP 4: DELETE the template completely (uncomment to run)
-- WARNING: This will also delete all tasks created from this template
/*
DELETE FROM task_templates
WHERE name ILIKE '%refuse storage%'
   OR slug ILIKE '%refuse%';
*/

-- STEP 5: DELETE all tasks from this template (uncomment to run)
/*
DELETE FROM checklist_tasks
WHERE template_id IN (
  SELECT id FROM task_templates
  WHERE name ILIKE '%refuse storage%'
     OR slug ILIKE '%refuse%'
);
*/

-- STEP 6: Check all EHO imported templates
SELECT 
  'All EHO Imported Templates' as check_type,
  id,
  name,
  slug,
  frequency,
  is_active,
  is_template_library,
  created_at
FROM task_templates
WHERE is_template_library = true
  AND (
    slug LIKE 'check-%'
    OR slug LIKE 'inspect-%'
    OR slug LIKE 'verify-%'
    OR slug LIKE 'maintain-%'
    OR slug LIKE 'review-%'
  )
ORDER BY created_at DESC;

