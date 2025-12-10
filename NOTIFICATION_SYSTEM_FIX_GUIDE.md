# Notification System Fix Guide

## Problem

You haven't seen any notifications for:

- Today's tasks
- Messages
- Calendar events

## Root Causes Identified

### 1. **Notification Functions Using Wrong Table**

The notification functions (`is_user_clocked_in`, `get_managers_on_shift`) were checking `attendance_logs` table, but your system uses `staff_attendance` table. This means:

- Users who are clocked in aren't being detected
- Managers on shift aren't being found
- Task notifications aren't being created

### 2. **Cron Job May Not Be Running**

The cron job that checks for tasks and creates notifications every 15 minutes may not be set up correctly or may not have the correct service role key.

### 3. **Tasks May Be Missing Required Fields**

Tasks need:

- `due_time` set (format: "HH:MM", e.g., "09:00")
- `assigned_to_user_id` set
- `due_date` = today
- Status = 'pending' or 'in_progress'

### 4. **Users May Not Be Clocked In**

For "ready" notifications (1 hour before task due time), users must be clocked in.

## Solution

### Step 1: Run the Diagnostic Script

First, run `DIAGNOSE_NOTIFICATION_SYSTEM.sql` in your Supabase SQL Editor to see what's wrong:

```sql
-- This will show you:
-- 1. Cron job status
-- 2. Function status
-- 3. Tasks due today
-- 4. Users clocked in
-- 5. Existing notifications
```

### Step 2: Apply the Fix

Run `FIX_NOTIFICATION_SYSTEM.sql` in your Supabase SQL Editor. This will:

- ✅ Update functions to use `staff_attendance` table
- ✅ Ensure all notification functions exist
- ✅ Add missing notification types
- ✅ Add missing columns to notifications table

### Step 3: Set Up Cron Job

The cron job needs your service role key. Do this:

1. **Get your service role key**:
   - Go to Supabase Dashboard → Settings → API
   - Copy the `service_role` key (keep it secret!)

2. **Update the migration file**:
   - Open `supabase/migrations/20250216000011_schedule_task_notification_cron.sql`
   - Replace `YOUR_SERVICE_ROLE_KEY` with your actual service role key
   - Replace the URL if your project URL is different

3. **Run the migration**:
   ```sql
   -- Run the updated migration in Supabase SQL Editor
   -- Or use: supabase db push
   ```

### Step 4: Verify Everything Works

#### Check Functions Exist

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_user_clocked_in',
    'get_managers_on_shift',
    'create_task_ready_notification',
    'create_late_task_notification'
  );
```

#### Test User Clock-In Detection

```sql
-- Replace with your user ID and site ID
SELECT is_user_clocked_in('USER_ID_HERE', 'SITE_ID_HERE');
-- Should return true if user is clocked in
```

#### Test Manager Detection

```sql
-- Replace with your site ID and company ID
SELECT * FROM get_managers_on_shift('SITE_ID_HERE', 'COMPANY_ID_HERE');
-- Should return list of managers currently on shift
```

#### Check Cron Job

```sql
SELECT * FROM cron.job WHERE jobname = 'check-task-notifications-cron';
-- Should show the cron job exists and is active
```

#### Check Recent Cron Executions

```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-task-notifications-cron')
ORDER BY start_time DESC
LIMIT 10;
-- Should show recent successful executions
```

### Step 5: Test Notification Creation

#### Create a Test Task

```sql
-- Create a task due in 30 minutes (so it's in the ready window)
INSERT INTO checklist_tasks (
  company_id,
  site_id,
  custom_name,
  due_date,
  due_time,
  assigned_to_user_id,
  status
) VALUES (
  'YOUR_COMPANY_ID',
  'YOUR_SITE_ID',
  'Test Notification Task',
  CURRENT_DATE,
  -- Set time to 30 minutes from now
  TO_CHAR(NOW() + INTERVAL '30 minutes', 'HH24:MI'),
  'YOUR_USER_ID',
  'pending'
);
```

#### Clock In as That User

Use your app's clock-in feature to clock in as the user assigned to the task.

#### Manually Trigger the Edge Function

```bash
# Replace with your project URL and service role key
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/check-task-notifications \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

#### Check if Notification Was Created

```sql
SELECT * FROM notifications
WHERE created_at::date = CURRENT_DATE
  AND type = 'task_ready'
ORDER BY created_at DESC;
```

## How Notifications Work Now

### Task Notifications

1. **Ready Notifications** (1 hour before due time):
   - Created when: Current time is within 1 hour before task's `due_time`
   - Requirement: Assigned user must be clocked in
   - Sent to: The assigned user

2. **Late Notifications** (1 hour after due time):
   - Created when: Current time is more than 1 hour after task's `due_time`
   - Requirement: At least one manager must be on shift
   - Sent to: All managers who are clocked in at that site

### Message Notifications

- Created when: Someone mentions you in a message (@username)
- Sent to: The mentioned user
- No clock-in requirement

### Calendar/Reminder Notifications

- Created when: You create a reminder in the calendar
- Sent to: You (the creator)
- No clock-in requirement

## Troubleshooting

### Still No Notifications?

1. **Check tasks have required fields**:

   ```sql
   SELECT id, custom_name, due_date, due_time, assigned_to_user_id, status
   FROM checklist_tasks
   WHERE due_date = CURRENT_DATE
     AND status IN ('pending', 'in_progress');
   ```

2. **Check users are clocked in**:

   ```sql
   SELECT p.full_name, sa.clock_in_time, sa.shift_status
   FROM profiles p
   JOIN staff_attendance sa ON sa.user_id = p.id
   WHERE sa.clock_out_time IS NULL
     AND sa.shift_status = 'on_shift'
     AND sa.clock_in_time::date = CURRENT_DATE;
   ```

3. **Check cron job is running**:

   ```sql
   SELECT * FROM cron.job_run_details
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-task-notifications-cron')
   ORDER BY start_time DESC
   LIMIT 5;
   ```

   - Look for `status = 'succeeded'`
   - Check `return_message` for any errors

4. **Manually test notification creation**:
   ```sql
   -- Test creating a ready notification
   SELECT create_task_ready_notification(
     'TASK_ID',
     'COMPANY_ID',
     'SITE_ID',
     'USER_ID',
     'Test Task',
     '14:00'
   );
   ```

### Common Issues

**Issue**: Cron job exists but never runs

- **Solution**: Check the service role key is correct in the cron job command
- **Solution**: Check edge function is deployed: `supabase functions deploy check-task-notifications`

**Issue**: Functions return NULL or 0

- **Solution**: Check users are actually clocked in using `staff_attendance` table
- **Solution**: Verify site_id and company_id are correct

**Issue**: Notifications created but not showing in UI

- **Solution**: Check RLS policies allow you to see notifications
- **Solution**: Check AlertsFeed component is loading correctly
- **Solution**: Check browser console for errors

## Next Steps

After applying the fix:

1. ✅ Run diagnostic script to verify everything is fixed
2. ✅ Set up cron job with your service role key
3. ✅ Test with a sample task
4. ✅ Monitor notifications being created
5. ✅ Check notifications appear in your dashboard

## Files Modified

- `FIX_NOTIFICATION_SYSTEM.sql` - Main fix script
- `DIAGNOSE_NOTIFICATION_SYSTEM.sql` - Diagnostic script
- Functions updated:
  - `is_user_clocked_in()` - Now checks `staff_attendance` table
  - `get_managers_on_shift()` - Now checks `staff_attendance` table
  - `create_task_ready_notification()` - Improved error handling
  - `create_late_task_notification()` - Improved error handling

## Summary

The main issue was that notification functions were checking the wrong attendance table. After running `FIX_NOTIFICATION_SYSTEM.sql`, the functions will correctly detect clocked-in users and managers, allowing notifications to be created properly.

Make sure to:

1. ✅ Run the fix script
2. ✅ Set up the cron job with your service role key
3. ✅ Ensure tasks have `due_time` set
4. ✅ Ensure users are clocked in
5. ✅ Test with a sample task
