# Quick Fix for Duplicate Tasks

## Problem Summary

- Database shows 0 duplicates (good!)
- But inactive templates still have tasks showing
- Two inactive templates: "Multi feature template" and "All features check"

## Quick Fix Steps

### Step 1: Delete Tasks from Inactive Templates

**In Supabase SQL Editor**, run this script:

```sql
-- File: scripts/delete-tasks-from-inactive-templates.sql

-- First, preview what will be deleted:
SELECT
  'Tasks to Delete' as action,
  ct.id,
  tt.name as template_name,
  ct.due_date,
  ct.status
FROM checklist_tasks ct
INNER JOIN task_templates tt ON tt.id = ct.template_id
WHERE tt.is_active = false;

-- Then, if it looks correct, delete them:
DELETE FROM checklist_tasks
WHERE id IN (
  SELECT ct.id
  FROM checklist_tasks ct
  INNER JOIN task_templates tt ON tt.id = ct.template_id
  WHERE tt.is_active = false
);
```

### Step 2: Refresh Active Tasks Page

The frontend now automatically filters out:

- ✅ Tasks from inactive templates
- ✅ Orphaned tasks (no template)
- ✅ Duplicate tasks (keeps oldest)

## What's Already Fixed

1. ✅ **Frontend filtering** - Active tasks page filters out inactive template tasks
2. ✅ **Unique constraint** - Prevents new duplicates at database level
3. ✅ **Deduplication logic** - Frontend removes duplicates before display
4. ✅ **Database cleanup** - Scripts ready to remove old duplicates

## Files to Use

- **Simple cleanup**: `scripts/delete-tasks-from-inactive-templates.sql`
- **Full diagnosis**: `scripts/complete-duplicate-diagnosis.sql`
- **Bulk delete duplicates**: `scripts/bulk-delete-duplicate-tasks.sql`

## Important Notes

- Make sure you're running `.sql` files in **Supabase SQL Editor**
- Do NOT try to run `.tsx` or `.ts` files as SQL
- Always preview before deleting (run SELECT queries first)
