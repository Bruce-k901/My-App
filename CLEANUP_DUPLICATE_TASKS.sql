-- Cleanup script to remove duplicate tasks
-- This keeps only ONE task per template_id + due_date + due_time + assigned_to_user_id + status combination
-- It keeps the task with the latest created_at (or highest ID if created_at is the same)
-- NOTE: Status is included - completed and pending tasks are considered different

BEGIN;

-- Step 1: Create a temporary table with the tasks we want to KEEP
-- (one per template/date/time/assignee/status combination)
CREATE TEMP TABLE tasks_to_keep AS
SELECT DISTINCT ON (template_id, due_date, due_time, assigned_to_user_id, company_id, status)
    id,
    template_id,
    due_date,
    due_time,
    assigned_to_user_id,
    company_id,
    status,
    created_at
FROM checklist_tasks
WHERE template_id IS NOT NULL
ORDER BY 
    template_id, 
    due_date, 
    due_time, 
    assigned_to_user_id, 
    company_id,
    status,
    created_at DESC,  -- Keep the most recently created
    id DESC;         -- If created_at is the same, keep the one with highest ID

-- Step 2: Show what will be deleted (for verification)
SELECT 
    'Tasks to DELETE' as action,
    COUNT(*) as count
FROM checklist_tasks ct
WHERE template_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 
        FROM tasks_to_keep ttk 
        WHERE ttk.id = ct.id
    );

-- Step 3: Show breakdown by template, date, and status
SELECT 
    'Breakdown of duplicates to delete' as info,
    ct.template_id,
    ct.due_date,
    ct.due_time,
    ct.assigned_to_user_id,
    ct.status,
    COUNT(*) as tasks_to_delete,
    STRING_AGG(ct.id::text, ', ' ORDER BY ct.created_at DESC) as task_ids_to_delete
FROM checklist_tasks ct
WHERE template_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 
        FROM tasks_to_keep ttk 
        WHERE ttk.id = ct.id
    )
GROUP BY ct.template_id, ct.due_date, ct.due_time, ct.assigned_to_user_id, ct.status
ORDER BY tasks_to_delete DESC, ct.due_date DESC
LIMIT 50;

-- Step 4: ACTUALLY DELETE the duplicates
-- UNCOMMENT THE LINE BELOW TO EXECUTE THE DELETION
-- DELETE FROM checklist_tasks
-- WHERE template_id IS NOT NULL
--     AND NOT EXISTS (
--         SELECT 1 
--         FROM tasks_to_keep ttk 
--         WHERE ttk.id = checklist_tasks.id
--     );

-- Step 5: Show summary after deletion (if deletion was executed)
-- SELECT 
--     'Remaining tasks' as status,
--     COUNT(*) as total_tasks,
--     COUNT(DISTINCT (template_id, due_date, due_time, assigned_to_user_id, status)) as unique_combinations
-- FROM checklist_tasks
-- WHERE template_id IS NOT NULL;

-- ROLLBACK;  -- Uncomment to rollback if needed
-- COMMIT;    -- Uncomment to commit the changes
