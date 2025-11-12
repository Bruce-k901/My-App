# Complete Duplicate Task Fix Guide

## Root Cause Analysis

After investigation, found multiple potential sources of duplicates:

### 1. ❌ Legacy Edge Function

- **File**: `supabase/functions/generate_daily_tasks/index.ts` (with underscore)
- **Issue**: Uses old `tasks` table (shouldn't affect `checklist_tasks`, but may be scheduled)
- **Action**: Check Supabase Dashboard for schedules on this function

### 2. ⚠️ Multiple Cron Jobs

- **Risk**: Multiple cron jobs calling task generation
- **Action**: Run diagnostic script to check

### 3. ⚠️ Race Conditions

- **Risk**: Multiple instances of generation function running simultaneously
- **Action**: Unique constraint should prevent, but verify it exists

### 4. ⚠️ Legacy Templates

- **Risk**: Inactive templates still generating tasks
- **Action**: Check template status

## Step-by-Step Fix

### Step 1: Run Complete Diagnosis

```sql
-- Run: scripts/complete-duplicate-diagnosis.sql
-- This will show:
-- - All cron jobs
-- - Rapid task creation patterns
-- - Templates creating too many tasks
-- - Current duplicates
-- - Unique constraint status
```

### Step 2: Check Supabase Dashboard

1. **Go to Supabase Dashboard**
2. **Edge Functions → Schedules**
3. **Check for schedules on**:
   - `generate-daily-tasks` ✅ (should have schedule)
   - `generate_daily_tasks` ❌ (should NOT have schedule - remove if exists)

### Step 3: Fix Cron Jobs

```sql
-- Run: scripts/fix-duplicate-task-generation-sources.sql
-- This will:
-- - Remove duplicate cron jobs
-- - Keep only 'generate-daily-tasks-cron'
```

### Step 4: Verify Unique Constraint

```sql
-- Check if unique constraint exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'checklist_tasks'
  AND indexdef LIKE '%unique%';
```

If it doesn't exist, run:

```sql
-- Run: supabase/migrations/20250206000003_add_unique_constraint_prevent_duplicates.sql
```

### Step 5: Clean Up Existing Duplicates

```sql
-- Run: scripts/bulk-delete-duplicate-tasks.sql
-- Step 1: Preview
-- Step 2: Count
-- Step 3: Uncomment and run delete
-- Step 4: Verify
```

### Step 6: Delete Legacy Edge Function (Optional)

```bash
# If you're sure it's not needed
supabase functions delete generate_daily_tasks
```

Or manually delete:

```
supabase/functions/generate_daily_tasks/
```

## Prevention Checklist

After fixes, verify:

- [ ] Only ONE cron job exists: `generate-daily-tasks-cron`
- [ ] Only ONE edge function scheduled: `generate-daily-tasks`
- [ ] Unique constraint exists on `checklist_tasks`
- [ ] Legacy edge function removed or unscheduled
- [ ] Frontend deduplication is active
- [ ] No duplicate tasks in database (run verification query)

## Monitoring

After fixes, monitor for 24-48 hours:

1. **Check task creation patterns**:

   ```sql
   SELECT
     DATE(created_at) as date,
     DATE_TRUNC('hour', created_at) as hour,
     COUNT(*) as tasks_created
   FROM checklist_tasks
   WHERE created_at >= CURRENT_DATE - INTERVAL '2 days'
   GROUP BY DATE(created_at), DATE_TRUNC('hour', created_at)
   ORDER BY date DESC, hour DESC;
   ```

2. **Check for new duplicates**:

   ```sql
   -- Should return 0
   WITH duplicates AS (
     SELECT template_id, site_id, due_date,
            COALESCE(daypart, '') as daypart,
            COALESCE(due_time::text, '') as due_time,
            COUNT(*) as count
     FROM checklist_tasks
     WHERE template_id IS NOT NULL
     GROUP BY template_id, site_id, due_date,
              COALESCE(daypart, ''), COALESCE(due_time::text, '')
     HAVING COUNT(*) > 1
   )
   SELECT COUNT(*) as new_duplicates FROM duplicates;
   ```

3. **Check browser console** on Active Tasks page:
   - Should see: `✅ Loaded X unique task(s) for display`
   - Should NOT see duplicate warnings

## Files Created

1. ✅ `scripts/complete-duplicate-diagnosis.sql` - Comprehensive diagnosis
2. ✅ `scripts/fix-duplicate-task-generation-sources.sql` - Cleanup cron jobs
3. ✅ `LEGACY_EDGE_FUNCTION_CLEANUP.md` - Legacy function cleanup guide
4. ✅ `COMPLETE_DUPLICATE_FIX_GUIDE.md` - This file

## Next Steps

1. **Run the diagnosis script** to see what's actually happening
2. **Check Supabase Dashboard** for duplicate schedules
3. **Run the cleanup script** to remove duplicate cron jobs
4. **Verify unique constraint** exists
5. **Monitor** for 24-48 hours to ensure no new duplicates
