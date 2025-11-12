# Legacy Edge Function Cleanup

## Problem Found

There are **TWO edge functions** with similar names that might both be running:

1. ✅ **`generate-daily-tasks/index.ts`** - NEW (correct)
   - Uses `checklist_tasks` table
   - Has proper duplicate prevention
   - Should be the only one running

2. ❌ **`generate_daily_tasks/index.ts`** - LEGACY (should be removed)
   - Uses old `tasks` table
   - Creates tasks in wrong table
   - May still be scheduled in Supabase Dashboard

## Impact

If both functions are scheduled:

- Tasks get created in both `tasks` and `checklist_tasks` tables
- Duplicates appear because they're creating tasks from different sources
- Legacy function doesn't have proper duplicate prevention

## Solution

### Step 1: Check Supabase Dashboard Schedules

1. Go to Supabase Dashboard
2. Navigate to **Edge Functions**
3. Check **BOTH** functions:
   - `generate-daily-tasks` (with hyphen)
   - `generate_daily_tasks` (with underscore)
4. **Remove any schedules** on `generate_daily_tasks` (legacy)
5. **Keep only** the schedule on `generate-daily-tasks` (new)

### Step 2: Run Diagnostic Script

```sql
-- Run: scripts/diagnose-task-generation-sources.sql
-- This will show:
-- - All cron jobs
-- - All task generation functions
-- - Template status
-- - Task creation patterns
```

### Step 3: Run Cleanup Script

```sql
-- Run: scripts/fix-duplicate-task-generation-sources.sql
-- This will:
-- - Remove duplicate cron jobs
-- - Verify only one cron job remains
-- - Identify problematic templates
```

### Step 4: Delete Legacy Edge Function (Optional but Recommended)

If you're sure the legacy function isn't needed:

```bash
# Delete the legacy function
supabase functions delete generate_daily_tasks
```

Or manually delete the folder:

```
supabase/functions/generate_daily_tasks/
```

## Files to Check

1. **Supabase Dashboard**:
   - Edge Functions → Schedules
   - Check for any schedules on `generate_daily_tasks`

2. **Database**:
   - Run diagnostic script to see cron jobs
   - Check for multiple `generate_daily_tasks_direct()` calls

3. **Code**:
   - `supabase/functions/generate-daily-tasks/index.ts` ✅ Keep
   - `supabase/functions/generate_daily_tasks/index.ts` ❌ Remove

## Prevention

After cleanup:

1. Only one cron job should exist: `generate-daily-tasks-cron`
2. Only one edge function should be scheduled: `generate-daily-tasks`
3. Unique constraint will prevent duplicates at database level
4. Frontend deduplication provides safety net
