# Cron Migration Instructions

## Overview

This migration updates the cron job to:

- Use **Active Tasks** (`checklist_tasks` table) as the source instead of `task_templates`
- Run at **7:10 AM UTC (8:10 AM BST)** for testing
- Regenerate tasks based on patterns that exist in your Active Tasks page

## Which Script to Run

### ✅ RECOMMENDED: Use the Consolidated Script (Easiest)

**File:** `apply_cron_migration.sql`

This is a single, consolidated script that includes everything you need. It's the easiest option.

### Steps:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/xijoybubtrgbrhquqwrx
   - Navigate to **SQL Editor** (left sidebar)

2. **Create New Query**
   - Click **"New Query"** button
   - Or use the **"+"** icon

3. **Copy and Paste**
   - Open the file `apply_cron_migration.sql` from your project
   - Copy **ALL** the contents (Ctrl+A, then Ctrl+C)
   - Paste into the SQL Editor (Ctrl+V)

4. **Run the Script**
   - Click the **"Run"** button (or press Ctrl+Enter)
   - Wait for it to complete

5. **Verify Success**
   - You should see notices like:
     - `✅ Cron job "generate-daily-tasks-cron" scheduled successfully for 7:10 AM UTC (8:10 AM BST) daily`
     - `✅ Cron now uses Active Tasks (checklist_tasks) as source instead of task_templates`

6. **Test the Function (Optional)**
   - Run this query to test:
   ```sql
   SELECT * FROM generate_daily_tasks_from_active_tasks();
   ```

   - This will show you how many tasks it would create (without actually creating them if they already exist)

---

## Alternative: Use Migration Files (If CLI Connection Works)

If your Supabase CLI connection is working, you can use the migration files:

### Files to Apply (in order):

1. **`supabase/migrations/20250207000001_update_cron_schedule_for_daily_tasks.sql`**
   - Creates the `generate_daily_tasks_only()` function
   - Schedules cron at 6 AM UTC (this will be replaced)

2. **`supabase/migrations/20250207000002_fix_single_daily_cron_comprehensive.sql`**
   - Updates `generate_daily_tasks_direct()` function
   - Schedules cron at 5:25 AM UTC (this will be replaced)

3. **`supabase/migrations/20250213000001_update_cron_to_use_active_tasks.sql`** ⭐ **FINAL**
   - Creates `generate_daily_tasks_from_active_tasks()` function
   - **Schedules cron at 7:10 AM UTC (8:10 AM BST)** ⭐
   - This is the one you want!

### Command:

```bash
supabase db push --include-all
```

---

## What This Migration Does

1. **Removes old cron jobs** (if they exist)
2. **Creates new function** `generate_daily_tasks_from_active_tasks()`
   - Reads from `checklist_tasks` (Active Tasks page)
   - Finds unique task patterns: `template_id + site_id + daypart + due_time`
   - Regenerates those patterns for today
3. **Schedules cron** to run daily at **7:10 AM UTC (8:10 AM BST)**
4. **Prevents duplicates** - only creates tasks that don't already exist for today

---

## Verification Queries

After running the migration, verify it worked:

```sql
-- Check if cron job exists
SELECT jobname, schedule, command
FROM cron.job
WHERE jobname = 'generate-daily-tasks-cron';

-- Check if function exists
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'generate_daily_tasks_from_active_tasks';

-- Test the function (shows what it would create)
SELECT * FROM generate_daily_tasks_from_active_tasks();
```

---

## Troubleshooting

### If you get "function does not exist" errors:

- Make sure you ran the entire `apply_cron_migration.sql` script
- The function is created in that script

### If cron job doesn't appear:

- Check the NOTICE messages in the SQL Editor output
- Verify pg_cron extension is enabled:
  ```sql
  SELECT * FROM pg_extension WHERE extname = 'pg_cron';
  ```

### If tasks aren't being generated:

- Make sure you have tasks in your Active Tasks page (`checklist_tasks` table)
- Check that those tasks have valid `template_id` values
- Verify templates are active: `SELECT * FROM task_templates WHERE is_active = true;`

---

## Next Steps After Migration

1. **Wait for 8:10 AM BST** to see the cron run automatically
2. **Or test manually** by running:
   ```sql
   SELECT * FROM generate_daily_tasks_from_active_tasks();
   ```
3. **Check Today's Tasks page** to see if new tasks appeared
4. **Monitor the cron** - you can check cron job history in Supabase dashboard

---

## Summary

**✅ Use:** `apply_cron_migration.sql` in Supabase Dashboard SQL Editor  
**⏰ Time:** 7:10 AM UTC = 8:10 AM BST  
**📋 Source:** Active Tasks (`checklist_tasks` table)  
**🔄 Frequency:** Daily
