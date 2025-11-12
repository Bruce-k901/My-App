# Duplicate Task Cleanup Guide

## Current Situation

Your analysis shows:

- ✅ **259 total tasks**
- ✅ **0 orphaned tasks** (all templates exist)
- ✅ **19 unique templates**
- ✅ **6 unique sites**
- ⚠️ **Some duplicate tasks** (need to identify and remove)

## Safe Cleanup Process

### Step 1: Preview Duplicates

Run this query to see exactly what will be removed:

```sql
-- From scripts/safe-remove-duplicates.sql - Step 1
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
```

This shows you:

- Which tasks will be deleted
- Which template/site/date combinations have duplicates
- The status of duplicate tasks

### Step 2: Count Duplicates

```sql
-- From scripts/safe-remove-duplicates.sql - Step 2
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
SELECT
  COUNT(*) as duplicates_to_remove,
  COUNT(DISTINCT template_id) as affected_templates,
  COUNT(DISTINCT site_id) as affected_sites
FROM duplicates
WHERE rn > 1;
```

### Step 3: Remove Duplicates

**After reviewing Steps 1 & 2**, uncomment and run:

```sql
-- This keeps the OLDEST task, deletes newer duplicates
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
```

### Step 4: Verify

```sql
-- Should return 0 duplicates
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
SELECT COUNT(*) as remaining_duplicates
FROM duplicates;
```

## What Gets Removed?

The cleanup removes tasks that have:

- Same `template_id`
- Same `site_id`
- Same `due_date`
- Same `daypart` (or both NULL)
- Same `due_time` (or both NULL)

**It keeps the OLDEST task** (first created) and removes newer duplicates.

## Safety Notes

1. ✅ **Preview first** - Always run Step 1 to see what will be deleted
2. ✅ **Backup** - Consider backing up before cleanup (though tasks can be regenerated)
3. ✅ **Review status** - Check if duplicates have different statuses (completed vs pending)
4. ✅ **Verify after** - Run Step 4 to confirm cleanup worked

## Alternative: Keep Completed Tasks

If you want to keep completed tasks instead of oldest:

```sql
-- Keep completed tasks, remove pending duplicates
WITH duplicates AS (
  SELECT
    id,
    status,
    ROW_NUMBER() OVER (
      PARTITION BY template_id, site_id, due_date, COALESCE(daypart, ''), COALESCE(due_time::text, '')
      ORDER BY
        CASE WHEN status = 'completed' THEN 0 ELSE 1 END,
        created_at ASC
    ) as rn
  FROM checklist_tasks
  WHERE template_id IS NOT NULL
)
DELETE FROM checklist_tasks
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
```

## After Cleanup

1. ✅ Check Active Tasks page - should be cleaner
2. ✅ Verify task counts make sense
3. ✅ Ensure new tasks generate correctly (after fixing the migration)
