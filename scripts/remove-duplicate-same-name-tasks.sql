-- ============================================================================
-- REMOVE DUPLICATE TASKS WITH SAME NAME
-- This script removes duplicate tasks that have the same name
-- Uses custom_name if available, otherwise uses template name
-- Keeps the oldest task (by created_at) for each name combination
-- ============================================================================

-- STEP 1: Preview what will be deleted (RUN THIS FIRST!)
-- This shows you exactly which duplicate tasks will be removed
WITH task_names AS (
  SELECT 
    ct.id,
    ct.template_id,
    ct.site_id,
    ct.due_date,
    ct.daypart,
    ct.due_time,
    ct.created_at,
    ct.status,
    ct.custom_name,
    COALESCE(ct.custom_name, tt.name, 'Unknown Task') as effective_name,
    s.name as site_name
  FROM checklist_tasks ct
  LEFT JOIN task_templates tt ON tt.id = ct.template_id
  LEFT JOIN sites s ON s.id = ct.site_id
  WHERE ct.template_id IS NOT NULL
),
duplicates AS (
  SELECT 
    id,
    template_id,
    site_id,
    due_date,
    daypart,
    due_time,
    created_at,
    status,
    custom_name,
    effective_name,
    site_name,
    ROW_NUMBER() OVER (
      PARTITION BY 
        effective_name,
        site_id,
        due_date,
        COALESCE(daypart, ''),
        COALESCE(due_time::text, '')
      ORDER BY created_at ASC
    ) as rn
  FROM task_names
)
SELECT 
  'Duplicates to Remove (Same Name)' as action,
  d.id,
  d.effective_name as task_name,
  d.custom_name,
  d.site_name,
  d.due_date,
  d.daypart,
  d.due_time,
  d.status,
  d.created_at,
  d.template_id
FROM duplicates d
WHERE d.rn > 1
ORDER BY d.effective_name, d.site_name, d.due_date, d.created_at DESC;

-- STEP 2: Count how many duplicates will be removed
WITH task_names AS (
  SELECT 
    ct.id,
    ct.site_id,
    ct.due_date,
    ct.daypart,
    ct.due_time,
    ct.created_at,
    COALESCE(ct.custom_name, tt.name, 'Unknown Task') as effective_name
  FROM checklist_tasks ct
  LEFT JOIN task_templates tt ON tt.id = ct.template_id
  WHERE ct.template_id IS NOT NULL
),
duplicates AS (
  SELECT 
    id,
    effective_name,
    site_id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        effective_name,
        site_id,
        due_date,
        COALESCE(daypart, ''),
        COALESCE(due_time::text, '')
      ORDER BY created_at ASC
    ) as rn
  FROM task_names
)
SELECT 
  'Summary' as info,
  COUNT(*) as duplicates_to_remove,
  COUNT(DISTINCT effective_name) as affected_task_names,
  COUNT(DISTINCT site_id) as affected_sites
FROM duplicates
WHERE rn > 1;

-- STEP 3: Group duplicates by name to see patterns
WITH task_names AS (
  SELECT 
    ct.id,
    ct.site_id,
    ct.due_date,
    ct.daypart,
    ct.due_time,
    ct.created_at,
    COALESCE(ct.custom_name, tt.name, 'Unknown Task') as effective_name,
    s.name as site_name
  FROM checklist_tasks ct
  LEFT JOIN task_templates tt ON tt.id = ct.template_id
  LEFT JOIN sites s ON s.id = ct.site_id
  WHERE ct.template_id IS NOT NULL
),
duplicate_groups AS (
  SELECT 
    effective_name,
    site_id,
    site_name,
    due_date,
    COALESCE(daypart, '') as daypart,
    COALESCE(due_time::text, '') as due_time,
    COUNT(*) as duplicate_count,
    array_agg(id ORDER BY created_at) as task_ids,
    array_agg(created_at ORDER BY created_at) as created_dates
  FROM task_names
  GROUP BY effective_name, site_id, site_name, due_date, COALESCE(daypart, ''), COALESCE(due_time::text, '')
  HAVING COUNT(*) > 1
)
SELECT 
  'Duplicate Groups' as info,
  effective_name as task_name,
  site_name,
  due_date,
  daypart,
  due_time,
  duplicate_count,
  task_ids[1] as keep_task_id,
  task_ids[2:] as delete_task_ids
FROM duplicate_groups
ORDER BY duplicate_count DESC, effective_name, site_name;

-- STEP 4: Actually remove duplicates (UNCOMMENT TO RUN)
-- WARNING: This will permanently delete duplicate tasks!
-- Only run after reviewing Steps 1, 2, and 3 results
/*
WITH task_names AS (
  SELECT 
    ct.id,
    ct.site_id,
    ct.due_date,
    ct.daypart,
    ct.due_time,
    ct.created_at,
    COALESCE(ct.custom_name, tt.name, 'Unknown Task') as effective_name
  FROM checklist_tasks ct
  LEFT JOIN task_templates tt ON tt.id = ct.template_id
  WHERE ct.template_id IS NOT NULL
),
duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        effective_name,
        site_id,
        due_date,
        COALESCE(daypart, ''),
        COALESCE(due_time::text, '')
      ORDER BY created_at ASC
    ) as rn
  FROM task_names
)
DELETE FROM checklist_tasks
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
*/

-- STEP 5: Verify cleanup (run after Step 4)
-- This should show 0 duplicates remaining
WITH task_names AS (
  SELECT 
    ct.id,
    ct.site_id,
    ct.due_date,
    ct.daypart,
    ct.due_time,
    COALESCE(ct.custom_name, tt.name, 'Unknown Task') as effective_name
  FROM checklist_tasks ct
  LEFT JOIN task_templates tt ON tt.id = ct.template_id
  WHERE ct.template_id IS NOT NULL
),
duplicate_groups AS (
  SELECT 
    effective_name,
    site_id,
    due_date,
    COALESCE(daypart, '') as daypart,
    COALESCE(due_time::text, '') as due_time,
    COUNT(*) as count
  FROM task_names
  GROUP BY effective_name, site_id, due_date, COALESCE(daypart, ''), COALESCE(due_time::text, '')
  HAVING COUNT(*) > 1
)
SELECT 
  'Verification' as info,
  COUNT(*) as remaining_duplicates
FROM duplicate_groups;

