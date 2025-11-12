-- ============================================================================
-- SAFE DUPLICATE REMOVAL SCRIPT
-- This script safely removes duplicate tasks, keeping the oldest one
-- ============================================================================

-- STEP 1: Preview what will be deleted (RUN THIS FIRST!)
-- This shows you exactly which duplicate tasks will be removed
WITH duplicates AS (
  SELECT 
    id,
    template_id,
    site_id,
    due_date,
    daypart,
    due_time,
    created_at,
    status,
    ROW_NUMBER() OVER (
      PARTITION BY template_id, site_id, due_date, COALESCE(daypart, ''), COALESCE(due_time::text, '') 
      ORDER BY created_at ASC
    ) as rn
  FROM checklist_tasks
  WHERE template_id IS NOT NULL
)
SELECT 
  'Duplicates to Remove' as action,
  d.id,
  d.template_id,
  d.site_id,
  d.due_date,
  d.daypart,
  d.due_time,
  d.status,
  d.created_at,
  t.name as template_name,
  s.name as site_name
FROM duplicates d
LEFT JOIN task_templates t ON t.id = d.template_id
LEFT JOIN sites s ON s.id = d.site_id
WHERE d.rn > 1
ORDER BY d.template_id, d.site_id, d.due_date, d.created_at DESC;

-- STEP 2: Count how many duplicates will be removed
WITH duplicates AS (
  SELECT 
    id,
    template_id,
    site_id,
    ROW_NUMBER() OVER (
      PARTITION BY template_id, site_id, due_date, COALESCE(daypart, ''), COALESCE(due_time::text, '') 
      ORDER BY created_at ASC
    ) as rn
  FROM checklist_tasks
  WHERE template_id IS NOT NULL
)
SELECT 
  'Summary' as info,
  COUNT(*) as duplicates_to_remove,
  COUNT(DISTINCT template_id) as affected_templates,
  COUNT(DISTINCT site_id) as affected_sites
FROM duplicates
WHERE rn > 1;

-- STEP 3: Actually remove duplicates (UNCOMMENT TO RUN)
-- WARNING: This will permanently delete duplicate tasks!
-- Only run after reviewing Step 1 and Step 2 results
/*
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY template_id, site_id, due_date, COALESCE(daypart, ''), COALESCE(due_time::text, '') 
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

-- STEP 4: Verify cleanup (run after Step 3)
-- This should show 0 duplicates remaining
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

