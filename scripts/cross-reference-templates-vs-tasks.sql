-- ============================================================================
-- CROSS-REFERENCE: Templates vs Active Tasks
-- This will show what templates exist and what tasks they're generating
-- ============================================================================

-- STEP 1: All templates (what should be visible in Templates/Compliance pages)
SELECT 
  'All Templates' as section,
  id,
  name,
  slug,
  company_id,
  frequency,
  is_active,
  is_template_library,
  dayparts,
  time_of_day,
  recurrence_pattern->'daypart_times' as daypart_times,
  created_at
FROM task_templates
ORDER BY is_template_library DESC, is_active DESC, name;

-- STEP 2: Templates that should appear in Templates page
-- (User-created templates: is_template_library = false)
SELECT 
  'Templates Page (User Created)' as section,
  id,
  name,
  frequency,
  is_active,
  dayparts,
  time_of_day,
  COUNT(ct.id) as tasks_created,
  COUNT(CASE WHEN ct.due_date = CURRENT_DATE THEN 1 END) as today_tasks
FROM task_templates tt
LEFT JOIN checklist_tasks ct ON ct.template_id = tt.id
WHERE tt.is_template_library = false
GROUP BY tt.id, tt.name, tt.frequency, tt.is_active, tt.dayparts, tt.time_of_day
ORDER BY tt.name;

-- STEP 3: Templates that should appear in Compliance page
-- (Library templates: is_template_library = true)
SELECT 
  'Compliance Page (Library Templates)' as section,
  id,
  name,
  frequency,
  is_active,
  dayparts,
  time_of_day,
  COUNT(ct.id) as tasks_created,
  COUNT(CASE WHEN ct.due_date = CURRENT_DATE THEN 1 END) as today_tasks
FROM task_templates tt
LEFT JOIN checklist_tasks ct ON ct.template_id = tt.id
WHERE tt.is_template_library = true
GROUP BY tt.id, tt.name, tt.frequency, tt.is_active, tt.dayparts, tt.time_of_day
ORDER BY tt.name;

-- STEP 4: All tasks in Active Tasks page (today's tasks)
SELECT 
  'Active Tasks Page (Today)' as section,
  ct.id as task_id,
  ct.template_id,
  tt.name as template_name,
  tt.is_template_library,
  tt.is_active as template_is_active,
  ct.due_date,
  ct.due_time,
  ct.daypart,
  ct.status,
  ct.created_at as task_created_at
FROM checklist_tasks ct
LEFT JOIN task_templates tt ON tt.id = ct.template_id
WHERE ct.due_date = CURRENT_DATE
ORDER BY ct.created_at DESC;

-- STEP 5: Tasks from INACTIVE templates (shouldn't exist!)
SELECT 
  '⚠️ PROBLEM: Tasks from INACTIVE Templates' as section,
  ct.id as task_id,
  ct.template_id,
  tt.name as template_name,
  tt.is_active as template_is_active,
  ct.due_date,
  ct.due_time,
  ct.daypart,
  ct.created_at
FROM checklist_tasks ct
INNER JOIN task_templates tt ON tt.id = ct.template_id
WHERE ct.due_date = CURRENT_DATE
  AND tt.is_active = false
ORDER BY tt.name, ct.daypart;

-- STEP 6: Tasks from DELETED templates (orphaned tasks)
SELECT 
  '⚠️ PROBLEM: Orphaned Tasks (Template Deleted)' as section,
  ct.id as task_id,
  ct.template_id,
  ct.due_date,
  ct.due_time,
  ct.daypart,
  ct.created_at
FROM checklist_tasks ct
LEFT JOIN task_templates tt ON tt.id = ct.template_id
WHERE ct.due_date = CURRENT_DATE
  AND tt.id IS NULL
ORDER BY ct.created_at DESC;

-- STEP 7: Summary - Count tasks by template source
SELECT 
  'Summary: Tasks by Template Source' as section,
  CASE 
    WHEN tt.id IS NULL THEN 'Orphaned (Template Deleted)'
    WHEN tt.is_template_library = true THEN 'From Compliance Page (Library)'
    WHEN tt.is_template_library = false THEN 'From Templates Page (User Created)'
    ELSE 'Unknown'
  END as template_source,
  COUNT(*) as task_count,
  COUNT(DISTINCT ct.template_id) as unique_templates
FROM checklist_tasks ct
LEFT JOIN task_templates tt ON tt.id = ct.template_id
WHERE ct.due_date = CURRENT_DATE
GROUP BY 
  CASE 
    WHEN tt.id IS NULL THEN 'Orphaned (Template Deleted)'
    WHEN tt.is_template_library = true THEN 'From Compliance Page (Library)'
    WHEN tt.is_template_library = false THEN 'From Templates Page (User Created)'
    ELSE 'Unknown'
  END
ORDER BY task_count DESC;

-- STEP 8: Active templates that are generating tasks
SELECT 
  'Active Templates Generating Tasks Today' as section,
  tt.id,
  tt.name,
  tt.is_template_library,
  tt.frequency,
  tt.is_active,
  COUNT(ct.id) as tasks_today,
  array_agg(DISTINCT ct.daypart ORDER BY ct.daypart) as dayparts_with_tasks,
  array_agg(DISTINCT ct.due_time ORDER BY ct.due_time) as times_with_tasks
FROM task_templates tt
INNER JOIN checklist_tasks ct ON ct.template_id = tt.id
WHERE ct.due_date = CURRENT_DATE
  AND tt.is_active = true
GROUP BY tt.id, tt.name, tt.is_template_library, tt.frequency, tt.is_active
ORDER BY tasks_today DESC;

-- STEP 9: Check for duplicate tasks (same template, site, date, daypart, time)
SELECT 
  '⚠️ PROBLEM: Duplicate Tasks' as section,
  template_id,
  tt.name as template_name,
  site_id,
  due_date,
  daypart,
  due_time,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at) as task_ids
FROM checklist_tasks ct
INNER JOIN task_templates tt ON tt.id = ct.template_id
WHERE due_date = CURRENT_DATE
GROUP BY template_id, tt.name, site_id, due_date, daypart, due_time
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

