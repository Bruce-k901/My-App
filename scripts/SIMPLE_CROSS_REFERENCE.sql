-- ============================================================================
-- SIMPLE CROSS-REFERENCE: What Should Show vs What Actually Shows
-- Company: EAG (f99510bc-b290-47c6-8f12-282bea67bd91)
-- ============================================================================

-- STEP 1: What templates should be on Templates Page (user-created for EAG)
SELECT 
  'Templates Page Should Show' as section,
  COUNT(*) as count,
  array_agg(name ORDER BY name) as template_names
FROM task_templates
WHERE company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91'
  AND is_template_library = false
  AND is_active = true;

-- STEP 2: What templates should be on Compliance Page (global library templates)
SELECT 
  'Compliance Page Should Show' as section,
  COUNT(*) as count,
  array_agg(name ORDER BY name) as template_names
FROM task_templates
WHERE company_id IS NULL
  AND is_template_library = true
  AND is_active = true;

-- STEP 3: How many tasks are in Active Tasks page today
SELECT 
  'Active Tasks Page (Today)' as section,
  COUNT(*) as total_tasks,
  COUNT(DISTINCT template_id) as unique_templates
FROM checklist_tasks
WHERE due_date = CURRENT_DATE;

-- STEP 4: Which templates are generating today's tasks
SELECT 
  'Templates Generating Today''s Tasks' as section,
  tt.id,
  tt.name,
  tt.company_id,
  tt.is_template_library,
  tt.is_active,
  COUNT(ct.id) as tasks_today
FROM task_templates tt
INNER JOIN checklist_tasks ct ON ct.template_id = tt.id
WHERE ct.due_date = CURRENT_DATE
GROUP BY tt.id, tt.name, tt.company_id, tt.is_template_library, tt.is_active
ORDER BY tasks_today DESC;

-- STEP 5: PROBLEM - Tasks from templates NOT on Templates or Compliance pages
SELECT 
  'PROBLEM: Tasks from Wrong Templates' as section,
  tt.name as template_name,
  tt.company_id,
  tt.is_template_library,
  tt.is_active,
  COUNT(ct.id) as tasks_today,
  CASE 
    WHEN tt.company_id IS NOT NULL AND tt.is_template_library = true THEN 'Company library template (should be global)'
    WHEN tt.is_active = false THEN 'Inactive template'
    WHEN tt.company_id IS NULL AND tt.is_template_library = false THEN 'Global user template (should have company_id)'
    WHEN tt.company_id != 'f99510bc-b290-47c6-8f12-282bea67bd91' AND tt.is_template_library = false THEN 'Different company template'
    ELSE 'Other issue'
  END as problem
FROM checklist_tasks ct
INNER JOIN task_templates tt ON tt.id = ct.template_id
WHERE ct.due_date = CURRENT_DATE
  AND (
    -- Not from Templates page (EAG user templates)
    NOT (tt.company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91' AND tt.is_template_library = false AND tt.is_active = true)
    AND
    -- Not from Compliance page (global library templates)
    NOT (tt.company_id IS NULL AND tt.is_template_library = true AND tt.is_active = true)
  )
GROUP BY tt.id, tt.name, tt.company_id, tt.is_template_library, tt.is_active
ORDER BY tasks_today DESC;

-- STEP 6: Summary - Where are today's tasks coming from?
SELECT 
  'Summary: Task Sources' as section,
  CASE 
    WHEN tt.id IS NULL THEN '❌ Orphaned (Template Deleted)'
    WHEN tt.company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91' AND tt.is_template_library = false AND tt.is_active = true THEN '✅ From Templates Page (EAG)'
    WHEN tt.company_id IS NULL AND tt.is_template_library = true AND tt.is_active = true THEN '✅ From Compliance Page (Global)'
    WHEN tt.is_active = false THEN '❌ From Inactive Template'
    WHEN tt.company_id IS NOT NULL AND tt.is_template_library = true THEN '❌ From Company Library Template'
    ELSE '❌ Other/Unknown'
  END as source,
  COUNT(*) as task_count,
  COUNT(DISTINCT ct.template_id) as template_count
FROM checklist_tasks ct
LEFT JOIN task_templates tt ON tt.id = ct.template_id
WHERE ct.due_date = CURRENT_DATE
GROUP BY 
  CASE 
    WHEN tt.id IS NULL THEN '❌ Orphaned (Template Deleted)'
    WHEN tt.company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91' AND tt.is_template_library = false AND tt.is_active = true THEN '✅ From Templates Page (EAG)'
    WHEN tt.company_id IS NULL AND tt.is_template_library = true AND tt.is_active = true THEN '✅ From Compliance Page (Global)'
    WHEN tt.is_active = false THEN '❌ From Inactive Template'
    WHEN tt.company_id IS NOT NULL AND tt.is_template_library = true THEN '❌ From Company Library Template'
    ELSE '❌ Other/Unknown'
  END
ORDER BY task_count DESC;

