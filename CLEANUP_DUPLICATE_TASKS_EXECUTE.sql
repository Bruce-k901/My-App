-- EXECUTE VERSION: Actually deletes duplicate tasks
-- WARNING: This will permanently delete duplicate tasks!
-- Run CLEANUP_DUPLICATE_TASKS_SAFE.sql first to verify what will be deleted

BEGIN;

-- Create a temporary table with the tasks we want to KEEP
-- (one per template/date/time/assignee/status combination, keeping the most recent)
-- NOTE: Status is included - completed and pending tasks are considered different
CREATE TEMP TABLE tasks_to_keep AS
SELECT DISTINCT ON (template_id, due_date, due_time, assigned_to_user_id, company_id, status)
    id
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

-- Show count of what will be deleted
DO $$
DECLARE
    delete_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO delete_count
    FROM checklist_tasks ct
    WHERE template_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 
            FROM tasks_to_keep ttk 
            WHERE ttk.id = ct.id
        );
    
    RAISE NOTICE 'Will delete % duplicate tasks', delete_count;
END $$;

-- Actually delete the duplicates
DELETE FROM checklist_tasks
WHERE template_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 
        FROM tasks_to_keep ttk 
        WHERE ttk.id = checklist_tasks.id
    );

-- Show final count
DO $$
DECLARE
    remaining_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_count
    FROM checklist_tasks
    WHERE template_id IS NOT NULL;
    
    RAISE NOTICE 'Remaining tasks: %', remaining_count;
END $$;

-- Verify no duplicates remain (including status in the check)
SELECT 
    template_id,
    due_date,
    due_time,
    assigned_to_user_id,
    status,
    COUNT(*) as count
FROM checklist_tasks
WHERE template_id IS NOT NULL
GROUP BY template_id, due_date, due_time, assigned_to_user_id, status
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 20;

-- If the query above returns any rows, there are still duplicates
-- Otherwise, commit the transaction
COMMIT;

-- If you see duplicates above, run ROLLBACK instead:
-- ROLLBACK;
