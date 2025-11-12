# Duplicate and Orphaned Tasks Analysis

## The Problem

The Active Tasks page is showing:

1. **Duplicate tasks** - Same template, site, date, daypart, and time appearing multiple times
2. **Orphaned tasks** - Tasks without templates (legacy instances from old system)

## Root Causes

### 1. Orphaned Tasks

- Tasks were created with `template_id` that no longer exists (template was deleted)
- Legacy tasks from old system before templates were properly set up
- Tasks with `template_id = NULL` (manually created tasks)

### 2. Duplicate Tasks

- Task generation function ran multiple times without proper duplicate checking
- Multiple cron jobs or manual triggers creating same tasks
- Edge cases in duplicate detection logic

## Analysis Scripts

I've created two scripts:

### 1. Analysis Script (`scripts/analyze-duplicate-and-orphaned-tasks.sql`)

Run this first to understand the scope:

- Count orphaned tasks
- Find duplicate tasks
- Show date ranges
- Summary statistics

### 2. Cleanup Script (`scripts/cleanup-orphaned-and-duplicate-tasks.sql`)

**WARNING**: Review analysis results before running!

- Safely identifies what will be deleted
- Provides multiple cleanup options
- All deletions are commented out by default

## Immediate Fixes Applied

### 1. Active Tasks Page Filtering

Updated `src/app/dashboard/tasks/active/page.tsx` to:

- ✅ Filter out orphaned tasks (tasks with `template_id` but no matching template)
- ✅ Keep legacy tasks (tasks with `NULL` template_id) for manual review
- ✅ Log warnings for orphaned/legacy tasks in console

### 2. Today's Tasks Page

Already filters out orphaned tasks (line 277-286 in `checklists/page.tsx`)

## Recommended Cleanup Steps

### Step 1: Run Analysis

```sql
-- Run scripts/analyze-duplicate-and-orphaned-tasks.sql
-- Review the results to understand scope
```

### Step 2: Clean Up Orphaned Tasks

```sql
-- Option A: Delete all orphaned tasks (recommended)
DELETE FROM checklist_tasks
WHERE template_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM task_templates tt WHERE tt.id = checklist_tasks.template_id
  );

-- Option B: Delete orphaned tasks older than 30 days (safer)
DELETE FROM checklist_tasks
WHERE template_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM task_templates tt WHERE tt.id = checklist_tasks.template_id
  )
  AND created_at < NOW() - INTERVAL '30 days';
```

### Step 3: Clean Up Duplicates

```sql
-- Delete duplicate tasks, keeping the oldest one
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
```

### Step 4: Clean Up Old Tasks (Optional)

```sql
-- Delete old completed tasks (older than 90 days)
DELETE FROM checklist_tasks
WHERE status = 'completed'
  AND completed_at IS NOT NULL
  AND completed_at < NOW() - INTERVAL '90 days';

-- Delete very old pending tasks (older than 180 days)
DELETE FROM checklist_tasks
WHERE status = 'pending'
  AND due_date < CURRENT_DATE - INTERVAL '180 days'
  AND created_at < NOW() - INTERVAL '180 days';
```

## Prevention

### 1. Fix Task Generation Function

The migration `20250206000002_fix_task_generation_concatenation_error.sql` fixes the bug that was preventing tasks from being created. Once deployed, new tasks should generate correctly.

### 2. Improve Duplicate Detection

The task generation function already checks for duplicates, but we can improve it:

- Check by `template_id`, `site_id`, `due_date`, `daypart`, AND `due_time`
- This is already implemented in the fixed function

### 3. Add Cascade Delete

Ensure templates cascade delete their tasks:

```sql
-- Verify foreign key constraint
SELECT
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'checklist_tasks'::regclass
  AND confrelid = 'task_templates'::regclass;
```

## Next Steps

1. ✅ **Run analysis script** to see scope of problem
2. ✅ **Review results** - decide what to clean up
3. ✅ **Run cleanup script** (uncomment the sections you want)
4. ✅ **Verify** - Check Active Tasks page shows clean list
5. ✅ **Deploy fixed migration** - Ensure new tasks generate correctly

## UI Improvements Made

The Active Tasks page now:

- Filters out orphaned tasks automatically
- Shows warnings in console for debugging
- Keeps legacy tasks (NULL template_id) for manual review
- Displays tasks with valid templates only

This should immediately improve the Active Tasks page display!
