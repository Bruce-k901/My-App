-- ============================================================================
-- INVESTIGATE TASKS ISSUE
-- ============================================================================
-- This will help us understand what's happening with the 136 tasks

-- 1. Check when tasks were created and by what
SELECT 
  DATE(ct.generated_at) as created_date,
  COUNT(*) as task_count,
  COUNT(DISTINCT ct.template_id) as unique_templates,
  COUNT(DISTINCT ct.site_id) as unique_sites
FROM checklist_tasks ct
WHERE ct.due_date = CURRENT_DATE
GROUP BY DATE(ct.generated_at)
ORDER BY created_date DESC;

-- 2. Check templates creating tasks
SELECT 
  tt.name as template_name,
  tt.frequency,
  tt.company_id,
  tt.site_id,
  COUNT(*) as task_count,
  COUNT(DISTINCT ct.site_id) as sites_affected,
  COUNT(DISTINCT ct.due_time) as unique_times,
  STRING_AGG(DISTINCT ct.due_time, ', ' ORDER BY ct.due_time) as all_times
FROM checklist_tasks ct
JOIN task_templates tt ON ct.template_id = tt.id
WHERE ct.due_date = CURRENT_DATE
GROUP BY tt.id, tt.name, tt.frequency, tt.company_id, tt.site_id
ORDER BY task_count DESC;

-- 3. Check for incorrect due_time values (dayparts instead of times)
SELECT 
  ct.due_time,
  COUNT(*) as count,
  STRING_AGG(DISTINCT tt.name, ', ') as templates
FROM checklist_tasks ct
JOIN task_templates tt ON ct.template_id = tt.id
WHERE ct.due_date = CURRENT_DATE
  AND (ct.due_time NOT SIMILAR TO '[0-9]{2}:[0-9]{2}' OR ct.due_time IS NULL)
GROUP BY ct.due_time
ORDER BY count DESC;

-- 4. Check tasks by site
SELECT 
  s.name as site_name,
  s.company_id,
  COUNT(*) as task_count,
  COUNT(DISTINCT ct.template_id) as unique_templates
FROM checklist_tasks ct
LEFT JOIN sites s ON ct.site_id = s.id
WHERE ct.due_date = CURRENT_DATE
GROUP BY s.id, s.name, s.company_id
ORDER BY task_count DESC;

-- 5. Check if tasks have correct structure (time format)
SELECT 
  CASE 
    WHEN ct.due_time IS NULL THEN 'NULL'
    WHEN ct.due_time SIMILAR TO '[0-9]{2}:[0-9]{2}' THEN 'Valid time (HH:MM)'
    ELSE 'Invalid (daypart or other)'
  END as time_format,
  COUNT(*) as count
FROM checklist_tasks ct
WHERE ct.due_date = CURRENT_DATE
GROUP BY 
  CASE 
    WHEN ct.due_time IS NULL THEN 'NULL'
    WHEN ct.due_time SIMILAR TO '[0-9]{2}:[0-9]{2}' THEN 'Valid time (HH:MM)'
    ELSE 'Invalid (daypart or other)'
  END;

-- 6. Check for potential duplicates (same template, site, time, date)
SELECT 
  ct.template_id,
  ct.site_id,
  ct.due_date,
  ct.due_time,
  COUNT(*) as duplicate_count,
  STRING_AGG(ct.id::text, ', ') as task_ids
FROM checklist_tasks ct
WHERE ct.due_date = CURRENT_DATE
GROUP BY ct.template_id, ct.site_id, ct.due_date, ct.due_time
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 7. Check tasks created today vs existing
SELECT 
  CASE 
    WHEN ct.generated_at::date = CURRENT_DATE THEN 'Created today'
    ELSE 'Created earlier'
  END as creation_status,
  COUNT(*) as count
FROM checklist_tasks ct
WHERE ct.due_date = CURRENT_DATE
GROUP BY 
  CASE 
    WHEN ct.generated_at::date = CURRENT_DATE THEN 'Created today'
    ELSE 'Created earlier'
  END;

