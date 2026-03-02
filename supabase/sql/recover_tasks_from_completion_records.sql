-- ============================================================================
-- RECOVER COMPLETED TASKS FROM COMPLETION RECORDS
-- ============================================================================
-- This script attempts to recover completed tasks by recreating them from
-- task_completion_records. Since completion records contain task_id references,
-- we can potentially restore the tasks if the completion records still exist.
--
-- WARNING: This will only work if task_completion_records still exist and
-- contain enough information to recreate the tasks.
-- ============================================================================

-- Step 1: Check if completion records still exist
SELECT 
  COUNT(*) as total_completion_records,
  COUNT(DISTINCT task_id) as unique_task_ids,
  MIN(completed_at) as oldest_completion,
  MAX(completed_at) as newest_completion
FROM public.task_completion_records;

-- Step 2: Find completion records that reference non-existent tasks
SELECT 
  tcr.id as completion_record_id,
  tcr.task_id,
  tcr.completed_at,
  tcr.completed_by,
  tcr.completion_data,
  CASE 
    WHEN ct.id IS NULL THEN 'MISSING_TASK'
    ELSE 'TASK_EXISTS'
  END as task_status
FROM public.task_completion_records tcr
LEFT JOIN public.checklist_tasks ct ON ct.id = tcr.task_id
WHERE ct.id IS NULL
LIMIT 20;

-- Step 3: Attempt to recover tasks from completion records
-- This creates new tasks with status='completed' based on completion records
-- NOTE: This is a best-effort recovery - some data may be missing
INSERT INTO public.checklist_tasks (
  id,
  template_id,
  company_id,
  site_id,
  due_date,
  due_time,
  daypart,
  status,
  completed_at,
  completed_by,
  task_data,
  created_at,
  updated_at
)
SELECT DISTINCT ON (tcr.task_id)
  tcr.task_id as id,  -- Use original task_id if possible
  COALESCE(
    (tcr.completion_data->>'template_id')::uuid,
    (tcr.completion_data->>'templateId')::uuid,
    NULL
  ) as template_id,
  COALESCE(
    (tcr.completion_data->>'company_id')::uuid,
    (SELECT company_id FROM public.profiles WHERE id = tcr.completed_by LIMIT 1),
    NULL
  ) as company_id,
  COALESCE(
    (tcr.completion_data->>'site_id')::uuid,
    (SELECT site_id FROM public.profiles WHERE id = tcr.completed_by LIMIT 1),
    NULL
  ) as site_id,
  COALESCE(
    (tcr.completion_data->>'due_date')::date,
    (tcr.completion_data->>'dueDate')::date,
    DATE(tcr.completed_at)
  ) as due_date,
  COALESCE(
    tcr.completion_data->>'due_time',
    tcr.completion_data->>'dueTime',
    NULL
  ) as due_time,
  COALESCE(
    tcr.completion_data->>'daypart',
    tcr.completion_data->>'completed_daypart',
    NULL
  ) as daypart,
  'completed' as status,
  tcr.completed_at,
  tcr.completed_by,
  tcr.completion_data as task_data,
  COALESCE(
    (tcr.completion_data->>'created_at')::timestamptz,
    tcr.completed_at - INTERVAL '1 day',  -- Estimate created_at as day before completion
    NOW()
  ) as created_at,
  tcr.completed_at as updated_at
FROM public.task_completion_records tcr
LEFT JOIN public.checklist_tasks ct ON ct.id = tcr.task_id
WHERE ct.id IS NULL  -- Only recover tasks that don't exist
  AND tcr.completed_at IS NOT NULL
ORDER BY tcr.task_id, tcr.completed_at DESC  -- Get most recent completion per task
ON CONFLICT (id) DO NOTHING;  -- Skip if task already exists

-- Step 4: Verify recovery
SELECT 
  COUNT(*) as recovered_tasks,
  COUNT(DISTINCT company_id) as companies_affected,
  MIN(completed_at) as oldest_recovered,
  MAX(completed_at) as newest_recovered
FROM public.checklist_tasks
WHERE status = 'completed'
  AND id IN (SELECT task_id FROM public.task_completion_records);

-- Step 5: Show sample of recovered tasks
SELECT 
  ct.id,
  ct.status,
  ct.completed_at,
  ct.completed_by,
  tt.name as template_name,
  ct.company_id,
  ct.site_id
FROM public.checklist_tasks ct
LEFT JOIN public.task_templates tt ON tt.id = ct.template_id
WHERE ct.status = 'completed'
  AND ct.id IN (SELECT task_id FROM public.task_completion_records)
ORDER BY ct.completed_at DESC
LIMIT 10;



