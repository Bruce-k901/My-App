-- ============================================================================
-- CHECK FOR ACTUAL DUPLICATES IN DATABASE
-- This will show if there are duplicate tasks in the database
-- ============================================================================

-- Check for duplicate task IDs (should never happen - id is primary key)
SELECT 
  'Duplicate IDs (CRITICAL)' as check_type,
  id,
  COUNT(*) as count
FROM checklist_tasks
GROUP BY id
HAVING COUNT(*) > 1;

-- Check for duplicate task combinations (same template, site, date, time, daypart)
-- These are the duplicates we're trying to prevent
WITH duplicate_combinations AS (
  SELECT 
    template_id,
    site_id,
    due_date,
    COALESCE(daypart, '') as daypart,
    COALESCE(due_time::text, '') as due_time,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at) as task_ids,
    array_agg(created_at ORDER BY created_at) as created_dates
  FROM checklist_tasks
  WHERE template_id IS NOT NULL
  GROUP BY template_id, site_id, due_date, COALESCE(daypart, ''), COALESCE(due_time::text, '')
  HAVING COUNT(*) > 1
)
SELECT 
  'Duplicate Combinations' as check_type,
  template_id,
  site_id,
  due_date,
  daypart,
  due_time,
  duplicate_count,
  task_ids[1] as oldest_task_id,
  task_ids[2:] as duplicate_task_ids,
  created_dates[1] as oldest_created,
  created_dates[2:] as duplicate_created_dates
FROM duplicate_combinations
ORDER BY duplicate_count DESC, due_date DESC
LIMIT 50;

-- Summary count
SELECT 
  'Summary' as check_type,
  COUNT(DISTINCT id) as unique_task_ids,
  COUNT(*) as total_tasks,
  COUNT(*) - COUNT(DISTINCT id) as duplicate_ids_count
FROM checklist_tasks;

-- Count duplicates by combination
SELECT 
  'Duplicate Summary' as check_type,
  COUNT(*) as duplicate_combinations,
  SUM(duplicate_count - 1) as total_duplicate_tasks
FROM (
  SELECT 
    template_id,
    site_id,
    due_date,
    COALESCE(daypart, '') as daypart,
    COALESCE(due_time::text, '') as due_time,
    COUNT(*) as duplicate_count
  FROM checklist_tasks
  WHERE template_id IS NOT NULL
  GROUP BY template_id, site_id, due_date, COALESCE(daypart, ''), COALESCE(due_time::text, '')
  HAVING COUNT(*) > 1
) duplicates;

