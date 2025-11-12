-- ============================================================================
-- ANALYZE: Duplicate and Orphaned Tasks
-- ============================================================================

-- Check 1: Tasks without templates (orphaned)
SELECT 
  'Check 1: Orphaned Tasks (no template)' as check_name,
  COUNT(*) as orphaned_count,
  COUNT(DISTINCT site_id) as affected_sites,
  MIN(created_at) as oldest_orphan,
  MAX(created_at) as newest_orphan
FROM checklist_tasks ct
WHERE ct.template_id IS NULL
   OR NOT EXISTS (
     SELECT 1 FROM task_templates tt WHERE tt.id = ct.template_id
   );

-- Show orphaned tasks
SELECT 
  'Orphaned Tasks Details' as info_type,
  ct.id,
  ct.template_id,
  ct.site_id,
  ct.due_date,
  ct.status,
  ct.created_at,
  ct.generated_at
FROM checklist_tasks ct
WHERE ct.template_id IS NULL
   OR NOT EXISTS (
     SELECT 1 FROM task_templates tt WHERE tt.id = ct.template_id
   )
ORDER BY ct.created_at DESC
LIMIT 20;

-- Check 2: Duplicate tasks (same template, site, date, daypart, time)
SELECT 
  'Check 2: Duplicate Tasks' as check_name,
  template_id,
  site_id,
  due_date,
  daypart,
  due_time,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at) as task_ids,
  array_agg(created_at ORDER BY created_at) as created_dates
FROM checklist_tasks
WHERE template_id IS NOT NULL
GROUP BY template_id, site_id, due_date, daypart, due_time
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, due_date DESC
LIMIT 20;

-- Check 3: Tasks with same template/site/date but different times (potential duplicates)
SELECT 
  'Check 3: Same Template/Site/Date (Different Times)' as check_name,
  template_id,
  site_id,
  due_date,
  COUNT(*) as task_count,
  array_agg(DISTINCT daypart) as dayparts,
  array_agg(DISTINCT due_time) as times,
  array_agg(id) as task_ids
FROM checklist_tasks
WHERE template_id IS NOT NULL
GROUP BY template_id, site_id, due_date
HAVING COUNT(*) > 1
ORDER BY task_count DESC, due_date DESC
LIMIT 20;

-- Check 4: Total task counts by status
SELECT 
  'Check 4: Tasks by Status' as check_name,
  status,
  COUNT(*) as task_count,
  COUNT(DISTINCT template_id) as unique_templates,
  COUNT(DISTINCT site_id) as unique_sites
FROM checklist_tasks
GROUP BY status
ORDER BY task_count DESC;

-- Check 5: Tasks by date range
WITH date_ranges AS (
  SELECT 
    CASE 
      WHEN due_date < CURRENT_DATE - INTERVAL '30 days' THEN 'Older than 30 days'
      WHEN due_date < CURRENT_DATE THEN 'Past (last 30 days)'
      WHEN due_date = CURRENT_DATE THEN 'Today'
      WHEN due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'Next 7 days'
      WHEN due_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Next 30 days'
      ELSE 'Future (beyond 30 days)'
    END as date_range,
    template_id
  FROM checklist_tasks
)
SELECT 
  'Check 5: Tasks by Date Range' as check_name,
  date_range,
  COUNT(*) as task_count,
  COUNT(*) FILTER (WHERE template_id IS NULL) as orphaned_count
FROM date_ranges
GROUP BY date_range
ORDER BY 
  CASE date_range
    WHEN 'Older than 30 days' THEN 1
    WHEN 'Past (last 30 days)' THEN 2
    WHEN 'Today' THEN 3
    WHEN 'Next 7 days' THEN 4
    WHEN 'Next 30 days' THEN 5
    ELSE 6
  END;

-- Check 6: Tasks with invalid template references
SELECT 
  'Check 6: Invalid Template References' as check_name,
  ct.id,
  ct.template_id,
  ct.site_id,
  ct.due_date,
  ct.status,
  CASE 
    WHEN ct.template_id IS NULL THEN 'NULL template_id'
    WHEN NOT EXISTS (SELECT 1 FROM task_templates tt WHERE tt.id = ct.template_id) 
    THEN 'Template does not exist'
    ELSE 'Valid'
  END as issue_type
FROM checklist_tasks ct
WHERE ct.template_id IS NULL
   OR NOT EXISTS (SELECT 1 FROM task_templates tt WHERE tt.id = ct.template_id)
ORDER BY ct.created_at DESC
LIMIT 20;

-- Check 7: Summary statistics
SELECT 
  'Summary' as info_type,
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE template_id IS NULL) as null_template_id,
  COUNT(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM task_templates tt WHERE tt.id = checklist_tasks.template_id)) as missing_template,
  COUNT(DISTINCT template_id) as unique_templates,
  COUNT(DISTINCT site_id) as unique_sites,
  MIN(created_at) as oldest_task,
  MAX(created_at) as newest_task
FROM checklist_tasks;

