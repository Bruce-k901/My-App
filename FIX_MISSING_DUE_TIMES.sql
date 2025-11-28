-- ============================================================================
-- Check Tasks Missing due_time and Fix Them
-- ============================================================================

-- Show tasks WITHOUT due_time
SELECT 
  id,
  custom_name,
  template_id,
  due_date,
  due_time,
  daypart,
  assigned_to_user_id,
  status,
  task_data,
  -- Check if time is stored in task_data instead
  task_data->>'due_time' as due_time_in_task_data,
  task_data->'daypart_times' as daypart_times_in_task_data,
  task_data->'dayparts' as dayparts_in_task_data,
  created_at
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND status IN ('pending', 'in_progress')
  AND (due_time IS NULL OR due_time = '')
ORDER BY created_at DESC;

-- Check if tasks have time information in task_data that could be used
SELECT 
  id,
  custom_name,
  daypart,
  due_time,
  task_data->'daypart_times' as daypart_times_in_task_data,
  task_data->'dayparts' as dayparts_in_task_data,
  -- Try to extract a time from daypart_times if it exists
  CASE 
    WHEN task_data->'daypart_times' IS NOT NULL AND jsonb_typeof(task_data->'daypart_times') = 'object' THEN
      -- Get first time value from daypart_times object
      (SELECT value::text 
       FROM jsonb_each(task_data->'daypart_times') 
       LIMIT 1)
    WHEN task_data->'daypart_times' IS NOT NULL AND jsonb_typeof(task_data->'daypart_times') = 'array' THEN
      -- Get first element if it's an array
      (task_data->'daypart_times'->0)::text
    ELSE NULL
  END as extracted_time
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND status IN ('pending', 'in_progress')
  AND (due_time IS NULL OR due_time = '')
ORDER BY created_at DESC;

-- Check what templates these tasks come from and their default times
SELECT 
  ct.id as task_id,
  ct.custom_name,
  ct.template_id,
  ct.due_time as task_due_time,
  ct.daypart,
  tt.name as template_name,
  tt.time_of_day as template_time_of_day,
  tt.dayparts as template_dayparts,
  tt.frequency as template_frequency
FROM checklist_tasks ct
LEFT JOIN task_templates tt ON tt.id = ct.template_id
WHERE ct.due_date = CURRENT_DATE
  AND ct.status IN ('pending', 'in_progress')
  AND (ct.due_time IS NULL OR ct.due_time = '')
ORDER BY ct.created_at DESC;

-- ============================================================================
-- Option 1: Update tasks with daypart_times to extract due_time
-- ============================================================================

-- This will update tasks that have daypart_times in task_data but no due_time
-- Uncomment and modify as needed
/*
UPDATE checklist_tasks
SET due_time = (
  SELECT 
    CASE 
      -- If daypart_times is an object, get first time value
      WHEN task_data->'daypart_times' IS NOT NULL THEN
        (SELECT value::text 
         FROM jsonb_each(task_data->'daypart_times') 
         LIMIT 1)
      -- If daypart_times is an array, get first element
      WHEN jsonb_typeof(task_data->'daypart_times') = 'array' THEN
        (task_data->'daypart_times'->0)::text
      ELSE NULL
    END
)
WHERE due_date = CURRENT_DATE
  AND status IN ('pending', 'in_progress')
  AND (due_time IS NULL OR due_time = '')
  AND task_data->'daypart_times' IS NOT NULL;
*/

-- ============================================================================
-- Option 2: Set default times based on daypart
-- ============================================================================

-- Set default times for tasks without due_time based on their daypart
-- Uncomment and modify as needed
/*
UPDATE checklist_tasks
SET due_time = CASE 
  WHEN daypart = 'morning' THEN '09:00'
  WHEN daypart = 'afternoon' THEN '14:00'
  WHEN daypart = 'evening' THEN '18:00'
  WHEN daypart = 'night' THEN '22:00'
  ELSE '12:00' -- Default to noon
END
WHERE due_date = CURRENT_DATE
  AND status IN ('pending', 'in_progress')
  AND (due_time IS NULL OR due_time = '')
  AND daypart IS NOT NULL;
*/

-- ============================================================================
-- Option 3: Set a default time for all tasks without due_time
-- ============================================================================

-- Set all tasks without due_time to a default time (e.g., 12:00)
-- Uncomment and modify as needed
/*
UPDATE checklist_tasks
SET due_time = '12:00'
WHERE due_date = CURRENT_DATE
  AND status IN ('pending', 'in_progress')
  AND (due_time IS NULL OR due_time = '');
*/

