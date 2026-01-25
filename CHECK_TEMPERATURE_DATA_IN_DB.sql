-- Check what temperature data is actually stored in task_completion_records
-- This will help us see if temperatures are being saved correctly

-- 1. Check completion_data structure for recent temperature tasks
SELECT 
  tcr.id,
  tcr.task_id,
  tcr.completed_at,
  tcr.completed_by,
  tcr.completion_data->'equipment_list' as equipment_list,
  tcr.completion_data->'temperature_records_count' as temp_records_count,
  tcr.completion_data->'temperatures' as temperatures_array,
  jsonb_array_length(COALESCE(tcr.completion_data->'equipment_list', '[]'::jsonb)) as equipment_list_length,
  tcr.completion_data->'temp_action' as temp_action,
  -- Check if any equipment has temperature data
  (
    SELECT jsonb_agg(eq)
    FROM jsonb_array_elements(COALESCE(tcr.completion_data->'equipment_list', '[]'::jsonb)) eq
    WHERE eq->>'temperature' IS NOT NULL 
       OR eq->>'reading' IS NOT NULL
       OR eq->>'temp' IS NOT NULL
  ) as equipment_with_temps,
  -- Get task details
  ct.custom_name as task_name,
  ct.flag_reason,
  tt.name as template_name
FROM task_completion_records tcr
LEFT JOIN checklist_tasks ct ON ct.id = tcr.task_id
LEFT JOIN task_templates tt ON tt.id = tcr.template_id
WHERE tcr.completed_at >= NOW() - INTERVAL '7 days'
  AND (
    -- Temperature-related templates
    tt.name ILIKE '%temperature%' 
    OR tt.name ILIKE '%fridge%'
    OR tt.name ILIKE '%freezer%'
    OR ct.flag_reason = 'monitoring'
  )
ORDER BY tcr.completed_at DESC
LIMIT 20;

-- 2. Check a specific task's completion_data in detail
-- Replace 'TASK_ID_HERE' with an actual task ID from above
/*
SELECT 
  tcr.id,
  tcr.task_id,
  tcr.completed_at,
  tcr.completion_data,
  jsonb_pretty(tcr.completion_data) as formatted_completion_data
FROM task_completion_records tcr
WHERE tcr.task_id = 'TASK_ID_HERE'
ORDER BY tcr.completed_at DESC
LIMIT 1;
*/

-- 3. Check temperature_logs table for records created from tasks
SELECT 
  tl.id,
  tl.asset_id,
  tl.reading,
  tl.status,
  tl.recorded_at,
  tl.recorded_by,
  tl.notes,
  a.name as asset_name,
  p.full_name as recorded_by_name
FROM temperature_logs tl
LEFT JOIN assets a ON a.id = tl.asset_id
LEFT JOIN profiles p ON p.id = tl.recorded_by
WHERE tl.recorded_at >= NOW() - INTERVAL '7 days'
  AND tl.notes ILIKE '%task%'
ORDER BY tl.recorded_at DESC
LIMIT 20;

-- 4. Compare: Check if equipment_list has temperatures but temperature_logs don't exist
SELECT 
  tcr.id,
  tcr.task_id,
  tcr.completed_at,
  jsonb_array_length(COALESCE(tcr.completion_data->'equipment_list', '[]'::jsonb)) as equipment_count,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(COALESCE(tcr.completion_data->'equipment_list', '[]'::jsonb)) eq
    WHERE eq->>'temperature' IS NOT NULL 
       OR eq->>'reading' IS NOT NULL
       OR eq->>'temp' IS NOT NULL
  ) as equipment_with_temps_count,
  (
    SELECT COUNT(*)
    FROM temperature_logs tl
    WHERE tl.recorded_at::date = tcr.completed_at::date
      AND tl.recorded_by = tcr.completed_by
  ) as temp_logs_count_for_user_on_date
FROM task_completion_records tcr
WHERE tcr.completed_at >= NOW() - INTERVAL '7 days'
  AND tcr.completion_data->'equipment_list' IS NOT NULL
ORDER BY tcr.completed_at DESC
LIMIT 20;
