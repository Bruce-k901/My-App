-- ============================================================================
-- FIX INACTIVE TEMPLATES GENERATING TASKS
-- This script deactivates templates that shouldn't be generating tasks
-- and removes tasks created by inactive templates
-- ============================================================================

-- STEP 1: Show inactive templates that have created tasks recently
SELECT 
  'Inactive Templates with Recent Tasks' as info,
  tt.id,
  tt.name,
  tt.frequency,
  tt.is_active,
  COUNT(ct.id) as task_count,
  MAX(ct.created_at) as latest_task_created,
  MIN(ct.created_at) as earliest_task_created
FROM task_templates tt
INNER JOIN checklist_tasks ct ON ct.template_id = tt.id
WHERE tt.is_active = false
  AND ct.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY tt.id, tt.name, tt.frequency, tt.is_active
ORDER BY task_count DESC;

-- STEP 2: Count tasks from inactive templates
SELECT 
  'Tasks from Inactive Templates' as info,
  COUNT(*) as total_tasks,
  COUNT(DISTINCT template_id) as affected_templates,
  COUNT(DISTINCT site_id) as affected_sites
FROM checklist_tasks ct
INNER JOIN task_templates tt ON tt.id = ct.template_id
WHERE tt.is_active = false
  AND ct.created_at >= CURRENT_DATE - INTERVAL '30 days';

-- STEP 3: Preview tasks that will be deleted (from inactive templates)
SELECT 
  'Tasks to Delete (from inactive templates)' as info,
  ct.id,
  ct.template_id,
  tt.name as template_name,
  ct.site_id,
  s.name as site_name,
  ct.due_date,
  ct.daypart,
  ct.due_time,
  ct.status,
  ct.created_at
FROM checklist_tasks ct
INNER JOIN task_templates tt ON tt.id = ct.template_id
LEFT JOIN sites s ON s.id = ct.site_id
WHERE tt.is_active = false
  AND ct.created_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY ct.created_at DESC;

-- STEP 4: Actually delete tasks from inactive templates (UNCOMMENT TO RUN)
-- WARNING: This will permanently delete tasks created by inactive templates!
-- Only run after reviewing Steps 1, 2, and 3
/*
DELETE FROM checklist_tasks
WHERE id IN (
  SELECT ct.id
  FROM checklist_tasks ct
  INNER JOIN task_templates tt ON tt.id = ct.template_id
  WHERE tt.is_active = false
);
*/

-- STEP 5: Verify inactive templates are truly inactive
-- Double-check that these templates are marked as inactive
SELECT 
  'Template Status Verification' as info,
  id,
  name,
  frequency,
  is_active,
  is_template_library,
  created_at,
  updated_at
FROM task_templates
WHERE id IN (
  '3119a7db-b1c2-4d26-98e9-971ae7b94b31',
  '32cb6276-5975-4d70-bf1c-6cd2b2674b68'
);

-- STEP 6: Ensure templates are deactivated (safety check)
-- This will set is_active = false if it's somehow true
UPDATE task_templates
SET is_active = false
WHERE id IN (
  '3119a7db-b1c2-4d26-98e9-971ae7b94b31',
  '32cb6276-5975-4d70-bf1c-6cd2b2674b68'
)
AND is_active = true;

-- STEP 7: Verify cleanup
SELECT 
  'Verification - Tasks from Inactive Templates' as info,
  COUNT(*) as remaining_tasks
FROM checklist_tasks ct
INNER JOIN task_templates tt ON tt.id = ct.template_id
WHERE tt.is_active = false
  AND ct.created_at >= CURRENT_DATE - INTERVAL '7 days';

