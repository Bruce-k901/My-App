-- ============================================================================
-- CLEANUP: Orphaned and Duplicate Tasks
-- WARNING: Review the analysis script results before running this!
-- ============================================================================

-- STEP 1: Identify tasks to delete (review first!)
-- Run this to see what will be deleted:

-- Orphaned tasks (no template)
SELECT 
  'Orphaned Tasks to Delete' as action,
  COUNT(*) as count_to_delete,
  array_agg(id) as task_ids
FROM checklist_tasks ct
WHERE ct.template_id IS NULL
   OR NOT EXISTS (
     SELECT 1 FROM task_templates tt WHERE tt.id = ct.template_id
   );

-- Duplicate tasks (keep the oldest, delete newer ones)
WITH duplicates AS (
  SELECT 
    id,
    template_id,
    site_id,
    due_date,
    daypart,
    due_time,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY template_id, site_id, due_date, daypart, due_time 
      ORDER BY created_at ASC
    ) as rn
  FROM checklist_tasks
  WHERE template_id IS NOT NULL
)
SELECT 
  'Duplicate Tasks to Delete' as action,
  COUNT(*) as count_to_delete,
  array_agg(id) as task_ids
FROM duplicates
WHERE rn > 1;

-- STEP 2: Delete orphaned tasks (uncomment to run)
-- WARNING: This will permanently delete tasks without templates!
/*
DELETE FROM checklist_tasks
WHERE template_id IS NULL
   OR NOT EXISTS (
     SELECT 1 FROM task_templates tt WHERE tt.id = checklist_tasks.template_id
   );
*/

-- STEP 3: Delete duplicate tasks, keeping the oldest (uncomment to run)
-- WARNING: This will delete duplicate tasks, keeping only the first created!
/*
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY template_id, site_id, due_date, daypart, due_time 
      ORDER BY created_at ASC
    ) as rn
  FROM checklist_tasks
  WHERE template_id IS NOT NULL
)
DELETE FROM checklist_tasks
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
*/

-- STEP 4: Alternative - Delete old completed tasks (safer cleanup)
-- This only deletes completed tasks older than 90 days
/*
DELETE FROM checklist_tasks
WHERE status = 'completed'
  AND completed_at IS NOT NULL
  AND completed_at < NOW() - INTERVAL '90 days';
*/

-- STEP 5: Alternative - Delete old pending tasks (very old, likely abandoned)
-- This only deletes pending tasks older than 180 days
/*
DELETE FROM checklist_tasks
WHERE status = 'pending'
  AND due_date < CURRENT_DATE - INTERVAL '180 days'
  AND created_at < NOW() - INTERVAL '180 days';
*/

