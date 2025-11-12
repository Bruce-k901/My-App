# Task Generation System - Complete Checklist

## ✅ Step 1: Verify Cron Job Setup

Run this SQL in Supabase SQL Editor:

```sql
-- File: scripts/verify-task-generation-setup.sql
```

**What to check:**

- ✅ Cron job exists: `generate-daily-tasks-cron`
- ✅ Schedule: `0 3 * * *` (3:00 AM UTC daily)
- ✅ Function exists: `generate_daily_tasks_direct()`
- ✅ Unique constraint exists: `idx_checklist_tasks_unique_template_task`

## ✅ Step 2: Verify Unique Constraint

The unique constraint prevents duplicates based on:

- `template_id`
- `site_id`
- `due_date`
- `daypart`
- `due_time`

**This means:**

- Same template + site + date + daypart + time = **ONE task only**
- Different daypart = **separate task**
- Different time = **separate task**

## ✅ Step 3: How Tasks Are Created

### Automated Generation (Cron - 3am UTC)

- ✅ Handles multiple dayparts correctly
- ✅ Handles multiple times per daypart correctly
- ✅ Creates one task per daypart+time combination
- ✅ Checks for existing tasks before creating
- ✅ Uses unique constraint as backup

### Manual Creation (TaskFromTemplateModal)

- ⚠️ **ISSUE**: Only creates ONE task (first daypart/time)
- ⚠️ **SHOULD**: Create multiple tasks for each daypart+time combination

### Compliance Template Creation

- ⚠️ **ISSUE**: Creates tasks for selected dayparts but not multiple times per daypart

## ✅ Step 4: Test with Multiple Dayparts/Times

### Create a Test Template

1. Go to Templates page
2. Create a new template with:
   - **Frequency**: Daily
   - **Dayparts**: `["before_open", "during_service", "after_service"]`
   - **Times**:
     ```json
     {
       "before_open": "06:00",
       "during_service": ["12:00", "15:00"],
       "after_service": "18:00"
     }
     ```
   - Store in `recurrence_pattern.daypart_times`

### Expected Result

- **Before Open**: 1 task at 06:00
- **During Service**: 2 tasks at 12:00 and 15:00
- **After Service**: 1 task at 18:00
- **Total**: 4 tasks for today

### How to Test

1. **Manual Trigger** (for testing):

   ```sql
   SELECT * FROM generate_daily_tasks_direct();
   ```

2. **Check Created Tasks**:

   ```sql
   SELECT
     id,
     template_id,
     due_date,
     daypart,
     due_time,
     created_at
   FROM checklist_tasks
   WHERE due_date = CURRENT_DATE
   ORDER BY daypart, due_time;
   ```

3. **Verify No Duplicates**:
   ```sql
   SELECT
     template_id,
     site_id,
     due_date,
     daypart,
     due_time,
     COUNT(*) as count
   FROM checklist_tasks
   WHERE due_date = CURRENT_DATE
   GROUP BY template_id, site_id, due_date, daypart, due_time
   HAVING COUNT(*) > 1;
   ```
   Should return 0 rows.

## ✅ Step 5: Verify Cron Runs Daily

### Check Cron Job History

```sql
SELECT
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'generate-daily-tasks-cron')
ORDER BY start_time DESC
LIMIT 10;
```

### Manual Test

```sql
-- Test the function manually
SELECT * FROM generate_daily_tasks_direct();
```

## 📋 Summary

### What's Working ✅

1. Automated task generation handles multiple dayparts/times
2. Unique constraint prevents duplicates
3. Cron job is scheduled for 3am UTC
4. Duplicate checks before insertion

### What Needs Fixing ⚠️

1. Manual task creation only creates one task
2. Compliance template creation doesn't handle multiple times per daypart

### Next Steps

1. Run verification script
2. Test with a template having multiple dayparts/times
3. Fix manual task creation (if needed)
4. Monitor cron job execution
