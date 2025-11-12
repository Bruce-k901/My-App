# Inactive Templates Still Generating Tasks - Fix

## Problem Found

Two inactive templates are still showing tasks in the Active Tasks page:

1. **"Multi feature template"** (ID: `3119a7db-b1c2-4d26-98e9-971ae7b94b31`)
   - `is_active = false`
   - 24 tasks created
   - Latest: 2025-11-06

2. **"All features check"** (ID: `32cb6276-5975-4d70-bf1c-6cd2b2674b68`)
   - `is_active = false`
   - 42 tasks created
   - Latest: 2025-11-06

## Root Cause

These tasks were likely created **BEFORE** the templates were deactivated. The task generation functions correctly check `is_active = true`, so they won't create NEW tasks, but old tasks remain in the database.

## Solution

### Step 1: Remove Tasks from Inactive Templates

```sql
-- Run: scripts/fix-inactive-templates-generating-tasks.sql
-- Step 1: Preview tasks from inactive templates
-- Step 2: Count how many will be deleted
-- Step 3: Preview what will be deleted
-- Step 4: Uncomment and run to delete
-- Step 5: Verify templates are inactive
-- Step 6: Ensure templates stay inactive (already runs automatically)
-- Step 7: Verify cleanup
```

### Step 2: Verify Templates Stay Inactive

The script will ensure these templates are marked as `is_active = false` (Step 6 runs automatically).

### Step 3: Check for Other Inactive Templates

Run this query to find all inactive templates with tasks:

```sql
SELECT
  tt.id,
  tt.name,
  COUNT(ct.id) as task_count
FROM task_templates tt
INNER JOIN checklist_tasks ct ON ct.template_id = tt.id
WHERE tt.is_active = false
GROUP BY tt.id, tt.name
ORDER BY task_count DESC;
```

## Prevention

The task generation functions already check `is_active = true`:

- ✅ Edge function: `supabase/functions/generate-daily-tasks/index.ts` (line 114)
- ✅ SQL function: `generate_daily_tasks_direct()` (line 39)

So inactive templates **won't create new tasks**. The issue is just cleaning up old tasks.

## Files

- ✅ `scripts/fix-inactive-templates-generating-tasks.sql` - Cleanup script
- ✅ `INACTIVE_TEMPLATES_FIX.md` - This guide
