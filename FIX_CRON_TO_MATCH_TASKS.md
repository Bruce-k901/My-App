# Fix Cron to Match Actual Tasks

## Problem

The cron is looking for tasks with:

- `due_date = today` ✅
- `status IN ('pending', 'in_progress')` ✅
- `due_time IS NOT NULL` ⚠️ **This might be the issue**

But tasks might be created without `due_time` set initially.

## Diagnostic Steps

### Step 1: Run Diagnostic Query

Run `DIAGNOSE_CRON_MISMATCH.sql` in Supabase SQL Editor to see:

- How many tasks exist today
- How many have `due_time` set
- What statuses they have
- What's preventing them from matching

### Step 2: Check What's Actually Happening

The cron query is:

```sql
SELECT * FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND status IN ('pending', 'in_progress')
  AND due_time IS NOT NULL
```

## Possible Fixes

### Option 1: Make Cron More Flexible (If tasks don't have due_time)

If tasks are created without `due_time`, we could:

1. Remove the `due_time IS NOT NULL` filter
2. Handle tasks without `due_time` by using a default time (e.g., "09:00")
3. Or skip notification timing for tasks without `due_time`

### Option 2: Fix Task Creation (If tasks should have due_time)

If tasks SHOULD have `due_time` but don't:

1. Update task generation to always set `due_time`
2. Update task creation forms to require `due_time`
3. Backfill existing tasks with default `due_time` values

### Option 3: Use Different Field (If due_time is stored elsewhere)

If `due_time` is stored in `task_data` instead:

1. Query `task_data->>'due_time'` instead
2. Or extract from `task_data.daypart_times`

## Next Steps

1. **Run the diagnostic query** to see what's actually in the database
2. **Check task generation code** to see if `due_time` is being set
3. **Decide on approach**: Fix cron query OR fix task creation
4. **Update accordingly**

## Quick Test

After fixing, test with:

```powershell
.\test-cron-fixed.ps1
```

And check the `tasks_checked` count - it should match what you see in the database!
