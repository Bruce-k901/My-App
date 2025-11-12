-- ============================================================================
-- COMPLETE CROSS-REFERENCE: Templates vs Active Tasks
-- This shows exactly what each page should show vs what tasks exist
-- ============================================================================

-- ===== WHAT COMPLIANCE PAGE SHOWS =====
-- Filters: company_id IS NULL, is_template_library = true, is_active = true
SELECT 
  'COMPLIANCE PAGE TEMPLATES' as section,
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

-- ===== WHAT TEMPLATES PAGE SHOWS =====
-- Filters: company_id = <your_company_id>, is_template_library = false, is_active = true
SELECT 
  'TEMPLATES PAGE TEMPLATES' as section,
  id,
  name,
  company_id,
  is_template_library,
  is_active,
  frequency,
  dayparts
FROM task_templates
WHERE company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91' -- EAG company
  AND is_template_library = false
  AND is_active = true
ORDER BY name;

-- ===== WHAT ACTIVE TASKS PAGE SHOWS =====
-- All tasks with due_date = CURRENT_DATE
SELECT 
  'ACTIVE TASKS PAGE (TODAY)' as section,
  ct.id as task_id,
  ct.template_id,
  tt.name as template_name,
  tt.company_id as template_company_id,
  tt.is_template_library,
  tt.is_active as template_is_active,
  ct.due_date,
  ct.due_time,
  ct.daypart,
  ct.status,
  ct.created_at
FROM checklist_tasks ct
LEFT JOIN task_templates tt ON tt.id = ct.template_id
WHERE ct.due_date = CURRENT_DATE
ORDER BY ct.created_at DESC;

-- ===== PROBLEM 1: Tasks from templates NOT in Compliance or Templates pages =====
SELECT 
  '⚠️ PROBLEM: Tasks from templates NOT on any page' as section,
  ct.id as task_id,
  ct.template_id,
  tt.name as template_name,
  tt.company_id,
  tt.is_template_library,
  tt.is_active,
  CASE 
    WHEN tt.company_id IS NOT NULL AND tt.is_template_library = true THEN 'Company-specific library template (should not exist!)'
    WHEN tt.is_active = false THEN 'Inactive template'
    WHEN tt.company_id IS NULL AND tt.is_template_library = false THEN 'Global user template (should have company_id)'
    ELSE 'Other issue'
  END as problem_type,
  ct.due_date,
  ct.daypart
FROM checklist_tasks ct
INNER JOIN task_templates tt ON tt.id = ct.template_id
WHERE ct.due_date = CURRENT_DATE
  AND (
    -- Not in Compliance page (company_id IS NULL, is_template_library = true, is_active = true)
    NOT (tt.company_id IS NULL AND tt.is_template_library = true AND tt.is_active = true)
    AND
    -- Not in Templates page (company_id = EAG, is_template_library = false, is_active = true)
    NOT (tt.company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91' AND tt.is_template_library = false AND tt.is_active = true)
  )
ORDER BY problem_type, tt.name;

-- ===== PROBLEM 2: Tasks from inactive templates =====
SELECT 
  '⚠️ PROBLEM: Tasks from INACTIVE templates' as section,
  ct.id as task_id,
  ct.template_id,
  tt.name as template_name,
  tt.is_active,
  ct.due_date,
  ct.daypart,
  ct.created_at
FROM checklist_tasks ct
INNER JOIN task_templates tt ON tt.id = ct.template_id
WHERE ct.due_date = CURRENT_DATE
  AND tt.is_active = false
ORDER BY tt.name, ct.daypart;

-- ===== PROBLEM 3: Tasks from company-specific library templates =====
-- These shouldn't exist - library templates should be global (company_id IS NULL)
SELECT 
  '⚠️ PROBLEM: Company-specific library templates' as section,
  tt.id as template_id,
  tt.name,
  tt.company_id,
  tt.is_template_library,
  COUNT(ct.id) as tasks_today
FROM task_templates tt
LEFT JOIN checklist_tasks ct ON ct.template_id = tt.id AND ct.due_date = CURRENT_DATE
WHERE tt.is_template_library = true
  AND tt.company_id IS NOT NULL
GROUP BY tt.id, tt.name, tt.company_id, tt.is_template_library
ORDER BY tasks_today DESC;

-- ===== PROBLEM 4: Orphaned tasks (template deleted) =====
SELECT 
  '⚠️ PROBLEM: Orphaned tasks (template deleted)' as section,
  ct.id as task_id,
  ct.template_id,
  ct.due_date,
  ct.daypart,
  ct.created_at
FROM checklist_tasks ct
LEFT JOIN task_templates tt ON tt.id = ct.template_id
WHERE ct.due_date = CURRENT_DATE
  AND tt.id IS NULL
ORDER BY ct.created_at DESC;

-- ===== SUMMARY: Count tasks by source =====
SELECT 
  'SUMMARY: Tasks by Source' as section,
  CASE 
    WHEN tt.id IS NULL THEN 'Orphaned (Template Deleted)'
    WHEN tt.company_id IS NULL AND tt.is_template_library = true AND tt.is_active = true THEN 'From Compliance Page ✅'
    WHEN tt.company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91' AND tt.is_template_library = false AND tt.is_active = true THEN 'From Templates Page ✅'
    WHEN tt.is_active = false THEN 'From Inactive Template ⚠️'
    WHEN tt.company_id IS NOT NULL AND tt.is_template_library = true THEN 'From Company Library Template ⚠️'
    ELSE 'Other/Unknown ⚠️'
  END as task_source,
  COUNT(*) as task_count,
  COUNT(DISTINCT ct.template_id) as unique_templates,
  array_agg(DISTINCT tt.name ORDER BY tt.name) FILTER (WHERE tt.name IS NOT NULL) as template_names
FROM checklist_tasks ct
LEFT JOIN task_templates tt ON tt.id = ct.template_id
WHERE ct.due_date = CURRENT_DATE
GROUP BY 
  CASE 
    WHEN tt.id IS NULL THEN 'Orphaned (Template Deleted)'
    WHEN tt.company_id IS NULL AND tt.is_template_library = true AND tt.is_active = true THEN 'From Compliance Page ✅'
    WHEN tt.company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91' AND tt.is_template_library = false AND tt.is_active = true THEN 'From Templates Page ✅'
    WHEN tt.is_active = false THEN 'From Inactive Template ⚠️'
    WHEN tt.company_id IS NOT NULL AND tt.is_template_library = true THEN 'From Company Library Template ⚠️'
    ELSE 'Other/Unknown ⚠️'
  END
ORDER BY task_count DESC;

-- ===== FIND YOUR COMPANY ID =====
SELECT 
  'Your Company ID' as section,
  id,
  name
FROM companies
ORDER BY created_at DESC
LIMIT 5;

