-- ============================================================================
-- FIND THE PROBLEM: Why tasks don't match what pages show
-- ============================================================================

-- STEP 1: What's actually on Compliance Page (should match what you see)
SELECT 
  'Compliance Page Templates (What You See)' as section,
  id,
  name,
  company_id,
  is_template_library,
  is_active,
  frequency,
  dayparts
FROM task_templates
WHERE company_id IS NULL
  AND is_template_library = true
  AND is_active = true
ORDER BY name;

-- STEP 2: What's actually on Templates Page (should match what you see)
SELECT 
  'Templates Page Templates (What You See)' as section,
  id,
  name,
  company_id,
  is_template_library,
  is_active,
  frequency,
  dayparts
FROM task_templates
WHERE company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91'
  AND is_template_library = false
  AND is_active = true
ORDER BY name;

-- STEP 3: PROBLEM - Company-specific library templates (shouldn't exist!)
SELECT 
  'PROBLEM: Company Library Templates' as section,
  id,
  name,
  company_id,
  is_template_library,
  is_active,
  frequency,
  dayparts,
  COUNT(ct.id) as tasks_today
FROM task_templates tt
LEFT JOIN checklist_tasks ct ON ct.template_id = tt.id AND ct.due_date = CURRENT_DATE
WHERE tt.is_template_library = true
  AND tt.company_id IS NOT NULL
GROUP BY tt.id, tt.name, tt.company_id, tt.is_template_library, tt.is_active, tt.frequency, tt.dayparts
ORDER BY tasks_today DESC;

-- STEP 4: Which templates are generating today's tasks
SELECT 
  'Templates Generating Tasks Today' as section,
  tt.id,
  tt.name,
  tt.company_id,
  tt.is_template_library,
  tt.is_active,
  COUNT(ct.id) as tasks_today,
  array_agg(DISTINCT ct.daypart ORDER BY ct.daypart) as dayparts_with_tasks
FROM task_templates tt
INNER JOIN checklist_tasks ct ON ct.template_id = tt.id
WHERE ct.due_date = CURRENT_DATE
GROUP BY tt.id, tt.name, tt.company_id, tt.is_template_library, tt.is_active
ORDER BY tasks_today DESC;

-- STEP 5: Compare - Templates on pages vs Templates generating tasks
SELECT 
  'Comparison: Page Templates vs Task-Generating Templates' as section,
  'On Compliance Page' as status,
  COUNT(*) as template_count
FROM task_templates
WHERE company_id IS NULL
  AND is_template_library = true
  AND is_active = true

UNION ALL

SELECT 
  'Comparison: Page Templates vs Task-Generating Templates' as section,
  'Generating Tasks (Global Library)' as status,
  COUNT(DISTINCT tt.id) as template_count
FROM task_templates tt
INNER JOIN checklist_tasks ct ON ct.template_id = tt.id
WHERE ct.due_date = CURRENT_DATE
  AND tt.company_id IS NULL
  AND tt.is_template_library = true
  AND tt.is_active = true

UNION ALL

SELECT 
  'Comparison: Page Templates vs Task-Generating Templates' as section,
  'On Templates Page' as status,
  COUNT(*) as template_count
FROM task_templates
WHERE company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91'
  AND is_template_library = false
  AND is_active = true

UNION ALL

SELECT 
  'Comparison: Page Templates vs Task-Generating Templates' as section,
  'Generating Tasks (EAG User)' as status,
  COUNT(DISTINCT tt.id) as template_count
FROM task_templates tt
INNER JOIN checklist_tasks ct ON ct.template_id = tt.id
WHERE ct.due_date = CURRENT_DATE
  AND tt.company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91'
  AND tt.is_template_library = false
  AND tt.is_active = true;

-- STEP 6: Find the company library template that's generating 18 tasks
SELECT 
  'Company Library Template Details' as section,
  tt.id,
  tt.name,
  tt.company_id,
  tt.is_template_library,
  tt.is_active,
  tt.frequency,
  tt.dayparts,
  COUNT(ct.id) as tasks_today,
  array_agg(DISTINCT ct.daypart ORDER BY ct.daypart) as dayparts_with_tasks,
  MIN(ct.created_at) as first_task_created,
  MAX(ct.created_at) as last_task_created
FROM task_templates tt
INNER JOIN checklist_tasks ct ON ct.template_id = tt.id
WHERE ct.due_date = CURRENT_DATE
  AND tt.is_template_library = true
  AND tt.company_id IS NOT NULL
GROUP BY tt.id, tt.name, tt.company_id, tt.is_template_library, tt.is_active, tt.frequency, tt.dayparts;

-- STEP 7: All templates with company_id set (should only be user-created, not library)
SELECT 
  'All Templates with Company ID Set' as section,
  id,
  name,
  company_id,
  is_template_library,
  is_active,
  frequency,
  created_at
FROM task_templates
WHERE company_id IS NOT NULL
ORDER BY is_template_library DESC, is_active DESC, name;

