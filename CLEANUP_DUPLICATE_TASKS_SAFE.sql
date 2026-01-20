-- SAFE VERSION: Shows what will be kept and deleted before actual deletion
-- Run this first to verify the cleanup will work correctly

-- Step 1: Show tasks that will be KEPT (one per combination)
-- NOTE: Status is included in the deduplication - completed and pending tasks are considered different
WITH tasks_to_keep AS (
    SELECT DISTINCT ON (template_id, due_date, due_time, assigned_to_user_id, company_id, status)
        id,
        template_id,
        due_date,
        due_time,
        assigned_to_user_id,
        company_id,
        created_at,
        custom_name,
        status
    FROM checklist_tasks
    WHERE template_id IS NOT NULL
    ORDER BY 
        template_id, 
        due_date, 
        due_time, 
        assigned_to_user_id, 
        company_id,
        status,
        created_at DESC,
        id DESC
)
SELECT 
    'KEEP' as action,
    ttk.template_id,
    ttk.due_date,
    ttk.due_time,
    ttk.assigned_to_user_id,
    ttk.id as task_id,
    ttk.custom_name,
    ttk.status,
    ttk.created_at
FROM tasks_to_keep ttk
ORDER BY ttk.due_date DESC, ttk.due_time, ttk.template_id
LIMIT 100;

-- Step 2: Show tasks that will be DELETED
WITH tasks_to_keep AS (
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
        created_at DESC,
        id DESC
)
SELECT 
    'DELETE' as action,
    ct.template_id,
    ct.due_date,
    ct.due_time,
    ct.assigned_to_user_id,
    ct.id as task_id,
    ct.custom_name,
    ct.status,
    ct.created_at
FROM checklist_tasks ct
WHERE template_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 
        FROM tasks_to_keep ttk 
        WHERE ttk.id = ct.id
    )
ORDER BY ct.due_date DESC, ct.due_time, ct.template_id
LIMIT 200;

-- Step 3: Summary statistics
WITH tasks_to_keep AS (
    SELECT DISTINCT ON (template_id, due_date, due_time, assigned_to_user_id, company_id, status)
        id,
        status
    FROM checklist_tasks
    WHERE template_id IS NOT NULL
    ORDER BY 
        template_id, 
        due_date, 
        due_time, 
        assigned_to_user_id, 
        company_id,
        status,
        created_at DESC,
        id DESC
)
SELECT 
    'SUMMARY' as info,
    (SELECT COUNT(*) FROM checklist_tasks WHERE template_id IS NOT NULL) as total_tasks,
    (SELECT COUNT(*) FROM tasks_to_keep) as tasks_to_keep,
    (SELECT COUNT(*) 
     FROM checklist_tasks ct
     WHERE template_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM tasks_to_keep ttk WHERE ttk.id = ct.id)
    ) as tasks_to_delete,
    (SELECT COUNT(*) 
     FROM checklist_tasks ct
     WHERE template_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM tasks_to_keep ttk WHERE ttk.id = ct.id)
    )::float / 
    NULLIF((SELECT COUNT(*) FROM checklist_tasks WHERE template_id IS NOT NULL), 0) * 100 
    as percent_to_delete;

-- Step 4: Breakdown by status (shows what will be deleted by status)
WITH tasks_to_keep AS (
    SELECT DISTINCT ON (template_id, due_date, due_time, assigned_to_user_id, company_id, status)
        id,
        status
    FROM checklist_tasks
    WHERE template_id IS NOT NULL
    ORDER BY 
        template_id, 
        due_date, 
        due_time, 
        assigned_to_user_id, 
        company_id,
        status,
        created_at DESC,
        id DESC
)
SELECT 
    'BREAKDOWN BY STATUS' as info,
    ct.status,
    COUNT(*) as total_tasks,
    COUNT(CASE WHEN EXISTS (SELECT 1 FROM tasks_to_keep ttk WHERE ttk.id = ct.id) THEN 1 END) as tasks_to_keep,
    COUNT(CASE WHEN NOT EXISTS (SELECT 1 FROM tasks_to_keep ttk WHERE ttk.id = ct.id) THEN 1 END) as tasks_to_delete,
    ROUND(
        (COUNT(CASE WHEN NOT EXISTS (SELECT 1 FROM tasks_to_keep ttk WHERE ttk.id = ct.id) THEN 1 END)::numeric / 
        NULLIF(COUNT(*), 0) * 100)::numeric, 
        2
    ) as percent_to_delete
FROM checklist_tasks ct
WHERE template_id IS NOT NULL
GROUP BY ct.status
ORDER BY tasks_to_delete DESC;
