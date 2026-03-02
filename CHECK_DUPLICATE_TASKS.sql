-- Check for duplicate tasks in checklist_tasks table
-- This will help identify if duplicates exist at the database level

-- 1. Check for duplicate IDs (should never happen if ID is primary key)
SELECT 
    id,
    COUNT(*) as count
FROM checklist_tasks
GROUP BY id
HAVING COUNT(*) > 1;

-- 2. Check for logical duplicates (same template, date, time, assignee)
-- These would be tasks that are essentially the same but have different IDs
SELECT 
    template_id,
    due_date,
    due_time,
    assigned_to_user_id,
    company_id,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as task_ids
FROM checklist_tasks
WHERE template_id IS NOT NULL
GROUP BY template_id, due_date, due_time, assigned_to_user_id, company_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, due_date DESC
LIMIT 50;

-- 3. Check total task count and unique task count
SELECT 
    COUNT(*) as total_tasks,
    COUNT(DISTINCT id) as unique_task_ids,
    COUNT(*) - COUNT(DISTINCT id) as duplicate_id_count
FROM checklist_tasks;

-- 4. Check for tasks with same ID but different data (data corruption check)
SELECT 
    id,
    COUNT(*) as count,
    COUNT(DISTINCT template_id) as distinct_templates,
    COUNT(DISTINCT due_date) as distinct_dates,
    COUNT(DISTINCT due_time) as distinct_times,
    COUNT(DISTINCT assigned_to_user_id) as distinct_assignees
FROM checklist_tasks
GROUP BY id
HAVING COUNT(*) > 1 
    OR COUNT(DISTINCT template_id) > 1 
    OR COUNT(DISTINCT due_date) > 1
    OR COUNT(DISTINCT due_time) > 1
    OR COUNT(DISTINCT assigned_to_user_id) > 1;

-- 5. Check recent tasks for a specific company (replace with your company_id)
-- This helps identify if duplicates are being created recently
SELECT 
    id,
    template_id,
    custom_name,
    due_date,
    due_time,
    assigned_to_user_id,
    status,
    created_at,
    updated_at
FROM checklist_tasks
WHERE company_id = 'f99510bc-b290-47c6-8f12-282bea67bd91'  -- Replace with your company_id
    AND due_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY due_date DESC, due_time DESC, created_at DESC
LIMIT 100;

-- 6. Check for tasks with the same template and date but different times
-- This might indicate tasks being created multiple times
SELECT 
    template_id,
    due_date,
    assigned_to_user_id,
    COUNT(*) as count,
    STRING_AGG(DISTINCT due_time::text, ', ' ORDER BY due_time::text) as times,
    STRING_AGG(id::text, ', ') as task_ids
FROM checklist_tasks
WHERE template_id IS NOT NULL
    AND due_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY template_id, due_date, assigned_to_user_id
HAVING COUNT(*) > 1
ORDER BY count DESC, due_date DESC
LIMIT 50;
