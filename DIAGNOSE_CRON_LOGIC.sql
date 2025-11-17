-- Diagnostic Query: Check what the cron logic would actually find
-- This simulates the cron's frequency and daypart checking logic

-- 1. Check all tasks that match cron's initial query (status filter)
SELECT 
  'Step 1: Tasks with pending/in_progress status' as step,
  COUNT(*) as count
FROM checklist_tasks
WHERE status IN ('pending', 'in_progress');

-- 2. Check tasks after filtering out cron-generated ones
SELECT 
  'Step 2: After excluding cron-generated tasks' as step,
  COUNT(*) as count
FROM checklist_tasks ct
WHERE ct.status IN ('pending', 'in_progress')
  AND (ct.task_data->>'source' != 'cron' OR ct.task_data->>'source' IS NULL);

-- 3. Check tasks with active templates
SELECT 
  'Step 3: Tasks with active templates' as step,
  COUNT(*) as count
FROM checklist_tasks ct
LEFT JOIN task_templates tt ON tt.id = ct.template_id
WHERE ct.status IN ('pending', 'in_progress')
  AND (ct.task_data->>'source' != 'cron' OR ct.task_data->>'source' IS NULL)
  AND tt.is_active = true;

-- 4. Check tasks that would be due TODAY based on frequency
-- This simulates the cron's isTaskDueToday() logic
WITH today_info AS (
  SELECT 
    EXTRACT(DOW FROM CURRENT_DATE)::int as day_of_week, -- 0=Sunday, 1=Monday, etc.
    EXTRACT(DAY FROM CURRENT_DATE)::int as date_of_month
)
SELECT 
  'Step 4: Tasks due TODAY based on frequency' as step,
  COUNT(*) as count,
  COUNT(CASE WHEN tt.frequency = 'daily' THEN 1 END) as daily_tasks,
  COUNT(CASE 
    WHEN tt.frequency = 'weekly' 
      AND (tt.recurrence_pattern->>'days')::jsonb ? (ti.day_of_week::text)
    THEN 1 
  END) as weekly_tasks_today,
  COUNT(CASE 
    WHEN tt.frequency = 'monthly' 
      AND (tt.recurrence_pattern->>'date_of_month')::int = ti.date_of_month
    THEN 1 
  END) as monthly_tasks_today
FROM checklist_tasks ct
LEFT JOIN task_templates tt ON tt.id = ct.template_id
CROSS JOIN today_info ti
WHERE ct.status IN ('pending', 'in_progress')
  AND (ct.task_data->>'source' != 'cron' OR ct.task_data->>'source' IS NULL)
  AND tt.is_active = true
  AND (
    -- Daily: always due
    tt.frequency = 'daily'
    OR
    -- Weekly: check if today matches days array
    (tt.frequency = 'weekly' AND (tt.recurrence_pattern->>'days')::jsonb ? (ti.day_of_week::text))
    OR
    -- Monthly: check if today matches date_of_month
    (tt.frequency = 'monthly' AND (tt.recurrence_pattern->>'date_of_month')::int = ti.date_of_month)
  );

-- 5. Show sample tasks that SHOULD match
SELECT 
  ct.id,
  ct.status,
  ct.due_date,
  ct.due_time,
  ct.daypart,
  tt.name as template_name,
  tt.frequency,
  tt.recurrence_pattern,
  CASE 
    WHEN tt.frequency = 'daily' THEN 'YES - daily'
    WHEN tt.frequency = 'weekly' THEN 
      CASE 
        WHEN (tt.recurrence_pattern->>'days')::jsonb ? (EXTRACT(DOW FROM CURRENT_DATE)::text) 
        THEN 'YES - matches weekly'
        ELSE 'NO - wrong day'
      END
    WHEN tt.frequency = 'monthly' THEN
      CASE
        WHEN (tt.recurrence_pattern->>'date_of_month')::int = EXTRACT(DAY FROM CURRENT_DATE) 
        THEN 'YES - matches monthly'
        ELSE 'NO - wrong date'
      END
    ELSE 'UNKNOWN'
  END as cron_would_find,
  ct.task_data->'dayparts' as task_dayparts,
  tt.dayparts as template_dayparts
FROM checklist_tasks ct
LEFT JOIN task_templates tt ON tt.id = ct.template_id
WHERE ct.status IN ('pending', 'in_progress')
  AND (ct.task_data->>'source' != 'cron' OR ct.task_data->>'source' IS NULL)
  AND (tt.is_active = true OR tt.is_active IS NULL)
ORDER BY ct.created_at DESC
LIMIT 20;

-- 6. Check if tasks have templates at all
SELECT 
  'Tasks without templates' as issue,
  COUNT(*) as count
FROM checklist_tasks ct
LEFT JOIN task_templates tt ON tt.id = ct.template_id
WHERE ct.status IN ('pending', 'in_progress')
  AND tt.id IS NULL;

-- 7. Check template frequency distribution
SELECT 
  tt.frequency,
  COUNT(*) as task_count,
  COUNT(CASE WHEN tt.is_active = true THEN 1 END) as active_template_count
FROM checklist_tasks ct
LEFT JOIN task_templates tt ON tt.id = ct.template_id
WHERE ct.status IN ('pending', 'in_progress')
GROUP BY tt.frequency
ORDER BY task_count DESC;

