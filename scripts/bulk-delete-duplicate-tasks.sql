-- ============================================================================
-- BULK DELETE DUPLICATE TASKS
-- This script removes ALL duplicate tasks, keeping only the oldest one
-- Works at the database level to handle large numbers of duplicates
-- ============================================================================

-- STEP 1: Preview what will be deleted (RUN THIS FIRST!)
-- Shows all duplicates that will be removed
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
      PARTITION BY 
        template_id,
        site_id,
        due_date,
        COALESCE(daypart, ''),
        COALESCE(due_time::text, '')
      ORDER BY created_at ASC
    ) as rn
  FROM checklist_tasks
  WHERE template_id IS NOT NULL
)
SELECT 
  'Duplicates to Delete' as action,
  d.id,
  d.template_id,
  d.site_id,
  d.due_date,
  d.daypart,
  d.due_time,
  d.created_at,
  t.name as template_name,
  s.name as site_name
FROM duplicates d
LEFT JOIN task_templates t ON t.id = d.template_id
LEFT JOIN sites s ON s.id = d.site_id
WHERE d.rn > 1
ORDER BY d.template_id, d.site_id, d.due_date, d.created_at DESC;

-- STEP 2: Count duplicates
WITH duplicates AS (
  SELECT 
    id,
    template_id,
    site_id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        template_id,
        site_id,
        due_date,
        COALESCE(daypart, ''),
        COALESCE(due_time::text, '')
      ORDER BY created_at ASC
    ) as rn
  FROM checklist_tasks
  WHERE template_id IS NOT NULL
)
SELECT 
  'Summary' as info,
  COUNT(*) as duplicates_to_delete,
  COUNT(DISTINCT template_id) as affected_templates,
  COUNT(DISTINCT site_id) as affected_sites
FROM duplicates
WHERE rn > 1;

-- STEP 3: Actually delete duplicates (UNCOMMENT TO RUN)
-- WARNING: This will permanently delete duplicate tasks!
-- Only run after reviewing Steps 1 and 2
/*
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        template_id,
        site_id,
        due_date,
        COALESCE(daypart, ''),
        COALESCE(due_time::text, '')
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

-- STEP 4: Verify cleanup
WITH duplicates AS (
  SELECT 
    template_id,
    site_id,
    due_date,
    COALESCE(daypart, '') as daypart,
    COALESCE(due_time::text, '') as due_time,
    COUNT(*) as count
  FROM checklist_tasks
  WHERE template_id IS NOT NULL
  GROUP BY template_id, site_id, due_date, COALESCE(daypart, ''), COALESCE(due_time::text, '')
  HAVING COUNT(*) > 1
)
SELECT 
  'Verification' as info,
  COUNT(*) as remaining_duplicates
FROM duplicates;

