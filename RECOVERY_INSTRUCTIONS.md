# 🚨 TASK RECOVERY INSTRUCTIONS

## What Happened

A migration (`20250221000001_archive_and_clean_tasks.sql`) was run that **deleted ALL tasks** from the `checklist_tasks` table. This migration was designed to clean up the database but unfortunately deleted all task instances, including recently completed ones.

## Recovery Options

### Option 1: Recover from Completion Records (RECOMMENDED)

If `task_completion_records` still exist, we can attempt to recreate the completed tasks from them.

**Steps:**

1. **Check if completion records exist:**

   ```sql
   SELECT COUNT(*) FROM public.task_completion_records;
   ```

2. **Run the recovery script:**
   - Open Supabase SQL Editor
   - Run: `supabase/sql/recover_tasks_from_completion_records.sql`
   - This will attempt to recreate completed tasks from completion records

3. **Verify recovery:**
   - Check the completed tasks page
   - Tasks should appear if recovery was successful

**Limitations:**

- Only recovers tasks that have completion records
- Some task metadata may be missing (template_id, site_id, etc.)
- Tasks without completion records cannot be recovered

### Option 2: Check Supabase Backups

If you have Supabase backups enabled:

1. Go to Supabase Dashboard → Database → Backups
2. Find a backup from before the migration ran
3. Restore the `checklist_tasks` table from backup

**Note:** This will restore ALL data from that backup, which may overwrite recent changes.

### Option 3: Manual Recreation

If recovery isn't possible:

- New tasks will be generated automatically by the daily task generation function
- Completed tasks cannot be manually recreated without their original data

## Prevention

To prevent this in the future:

1. **Review migrations before running them** - Check for `DELETE` statements
2. **Create backups before major migrations**
3. **Test migrations on a staging environment first**
4. **Consider adding a backup step to destructive migrations**

## Migration That Caused This

**File:** `supabase/migrations/20250221000001_archive_and_clean_tasks.sql`

**Line 30:** `DELETE FROM checklist_tasks; -- All task instances gone`

This migration should have been:

- Run only in development/staging
- Modified to only delete old tasks (e.g., older than X months)
- Included a backup step before deletion

## Next Steps

1. ✅ Check if `task_completion_records` exist
2. ✅ Run recovery script if records exist
3. ✅ Verify recovered tasks appear on completed tasks page
4. ✅ Document what was lost vs. what was recovered
5. ✅ Review and modify the migration to prevent future issues
