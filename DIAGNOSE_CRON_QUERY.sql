-- Diagnostic Query: Check what the cron is actually looking for
-- This matches the cron's query logic exactly

-- 1. Check all active tasks (what cron queries)
SELECT 
  COUNT(*) as total_active_tasks,
  COUNT(CASE WHEN task_data->>'source' = 'cron' THEN 1 END) as cron_generated,
  COUNT(CASE WHEN task_data->>'source' != 'cron' OR task_data->>'source' IS NULL THEN 1 END) as manually_created
FROM checklist_tasks
WHERE status IN ('pending', 'in_progress');

-- 2. Check tasks with templates and their frequencies
SELECT 
  ct.id,
  ct.status,
  ct.due_date,
  ct.due_time,
  ct.daypart,
  ct.task_data,
  tt.name as template_name,
  tt.frequency,
  tt.dayparts as template_dayparts,
  tt.recurrence_pattern,
  tt.is_active as template_is_active,
  CASE 
    WHEN tt.frequency = 'daily' THEN 'YES - daily always due'
    WHEN tt.frequency = 'weekly' THEN 
      CASE 
        WHEN (tt.recurrence_pattern->>'days')::jsonb ? (EXTRACT(DOW FROM CURRENT_DATE)::text) THEN 'YES - matches weekly pattern'
        ELSE 'NO - wrong day of week'
      END
    WHEN tt.frequency = 'monthly' THEN
      CASE
        WHEN (tt.recurrence_pattern->>'date_of_month')::int = EXTRACT(DAY FROM CURRENT_DATE) THEN 'YES - matches monthly date'
        ELSE 'NO - wrong date of month'
      END
    ELSE 'UNKNOWN FREQUENCY'
  END as would_be_due_today
FROM checklist_tasks ct
LEFT JOIN task_templates tt ON tt.id = ct.template_id
WHERE ct.status IN ('pending', 'in_progress')
  AND (ct.task_data->>'source' != 'cron' OR ct.task_data->>'source' IS NULL)
  AND (tt.is_active = true OR tt.is_active IS NULL)
ORDER BY ct.created_at DESC
LIMIT 20;

-- 3. Check frequency distribution
SELECT 
  tt.frequency,
  COUNT(*) as task_count,
  COUNT(CASE WHEN tt.is_active = true THEN 1 END) as active_template_count
FROM checklist_tasks ct
LEFT JOIN task_templates tt ON tt.id = ct.template_id
WHERE ct.status IN ('pending', 'in_progress')
  AND (ct.task_data->>'source' != 'cron' OR ct.task_data->>'source' IS NULL)
GROUP BY tt.frequency
ORDER BY task_count DESC;

-- 4. Check dayparts distribution
SELECT 
  ct.daypart,
  COUNT(*) as count,
  COUNT(CASE WHEN ct.due_time IS NOT NULL THEN 1 END) as with_due_time
FROM checklist_tasks ct
LEFT JOIN task_templates tt ON tt.id = ct.template_id
WHERE ct.status IN ('pending', 'in_progress')
  AND (ct.task_data->>'source' != 'cron' OR ct.task_data->>'source' IS NULL)
  AND (tt.is_active = true OR tt.is_active IS NULL)
GROUP BY ct.daypart
ORDER BY count DESC;

-- 5. Sample tasks with full details
SELECT 
  ct.id,
  ct.status,
  ct.due_date,
  ct.due_time,
  ct.daypart,
  ct.task_data->'dayparts' as task_data_dayparts,
  ct.task_data->'daypart_times' as task_data_daypart_times,
  tt.name as template_name,
  tt.frequency,
  tt.dayparts as template_dayparts,
  tt.recurrence_pattern,
  tt.is_active
FROM checklist_tasks ct
LEFT JOIN task_templates tt ON tt.id = ct.template_id
WHERE ct.status IN ('pending', 'in_progress')
ORDER BY ct.created_at DESC
LIMIT 10;

