# Notification System Analysis & Troubleshooting Guide

## Overview

Your notification system has multiple components that work together to create and display notifications for tasks, reminders, and other events. This document explains how it's supposed to work and why you might not be receiving notifications.

---

## How Notifications Are Supposed to Work

### 1. **Task Notifications** (Ready & Late)

**When they're created:**

- **Ready notifications**: Created 1 hour BEFORE a task's due time (only if the assigned user is clocked in)
- **Late notifications**: Created 1 hour AFTER a task's due time (sent to managers on shift)

**Requirements:**

- Task must have `due_date = today`
- Task must have `due_time` set (e.g., "09:00", "14:30")
- Task must have `assigned_to_user_id` set
- Task status must be `pending` or `in_progress`
- For ready notifications: User must be clocked in (`attendance_logs` with `clock_out_at IS NULL`)
- For late notifications: At least one manager must be on shift

**How it works:**

1. A cron job runs every 15 minutes calling the `check-task-notifications` edge function
2. The function queries tasks due today with a `due_time`
3. It checks if current time is within the notification window (1 hour before/after due time)
4. It calls database functions to create notifications:
   - `create_task_ready_notification()` - Creates notification for assigned user
   - `create_late_task_notification()` - Creates notifications for managers on shift

### 2. **PPM Notifications** (Maintenance Reminders)

**When they're created:**

- Daily via `generate-ppm-notifications` edge function
- Created for PPMs due within 14 days or overdue

**Requirements:**

- PPM schedule must exist with `next_service_date` set
- PPM status must be `scheduled`, `due_soon`, or `overdue`

### 3. **Daily Digest Notifications**

**When they're created:**

- Daily via `send_daily_digest` edge function
- Summary of incidents, incomplete tasks, and temperature warnings

### 4. **Incident & Temperature Notifications**

**When they're created:**

- Automatically via database triggers when incidents are created
- Automatically when temperature logs are marked as "failed"

---

## Why You're Not Receiving Notifications

### Most Likely Issues:

#### 1. **Cron Job Not Running** ⚠️ CRITICAL

The task notification cron job may not be scheduled or configured correctly.

**Check:**

```sql
-- Check if cron job exists
SELECT * FROM cron.job WHERE jobname = 'check-task-notifications-cron';

-- Check cron job execution history
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-task-notifications-cron')
ORDER BY start_time DESC LIMIT 10;
```

**Fix:**
The migration file `20250216000011_schedule_task_notification_cron.sql` has a hardcoded URL and placeholder for service role key. You need to:

1. Update the URL to your actual Supabase project URL
2. Replace `YOUR_SERVICE_ROLE_KEY` with your actual service role key
3. Ensure the edge function is deployed: `supabase functions deploy check-task-notifications`

#### 2. **Tasks Missing Required Fields**

Tasks need specific fields for notifications to work:

**Check:**

```sql
-- Find tasks due today without due_time
SELECT id, custom_name, due_date, due_time, assigned_to_user_id, status
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND (due_time IS NULL OR assigned_to_user_id IS NULL)
  AND status IN ('pending', 'in_progress');
```

**Fix:**

- Ensure tasks have `due_time` set when created
- Ensure tasks have `assigned_to_user_id` set

#### 3. **Users Not Clocked In**

Ready notifications only work if the assigned user is clocked in.

**Check:**

```sql
-- Check if users are clocked in
SELECT
  p.id,
  p.full_name,
  a.clock_in_at,
  a.clock_out_at,
  a.site_id
FROM profiles p
LEFT JOIN attendance_logs a ON a.user_id = p.id
  AND a.clock_out_at IS NULL
  AND a.clock_in_at::date = CURRENT_DATE
WHERE p.app_role IN ('Staff', 'Manager', 'General Manager');
```

**Fix:**

- Users need to clock in via the clock-in feature
- Check that `attendance_logs` table exists and has data

#### 4. **No Managers On Shift**

Late notifications only go to managers who are clocked in.

**Check:**

```sql
-- Check managers on shift
SELECT * FROM get_managers_on_shift(NULL, NULL);
```

**Fix:**

- Managers need to clock in
- Ensure managers have correct `app_role` set in profiles table

#### 5. **Notification Functions Don't Exist**

The database functions might not be created.

**Check:**

```sql
-- Check if functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'create_task_ready_notification',
    'create_late_task_notification',
    'is_user_clocked_in',
    'get_managers_on_shift'
  );
```

**Fix:**

- Run the migration: `supabase/migrations/20250216000009_create_notification_system.sql`
- Or manually create the functions from that file

#### 6. **Notifications Table Schema Mismatch**

The `notifications` table might be missing required columns.

**Check:**

```sql
-- Check table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'notifications'
ORDER BY ordinal_position;
```

**Required columns:**

- `task_id` (UUID, references checklist_tasks)
- `push_sent` (BOOLEAN)
- `type` should include 'task_ready' and 'task_late'

**Fix:**

- Run the migration that adds these columns
- Or manually add them if missing

---

## Step-by-Step Troubleshooting

### Step 1: Verify Cron Job Setup

```sql
-- Check if cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check if cron job exists
SELECT jobid, jobname, schedule, command, active
FROM cron.job
WHERE jobname = 'check-task-notifications-cron';

-- If it doesn't exist, you need to create it
```

### Step 2: Test Notification Functions Manually

```sql
-- Test if user is clocked in
SELECT is_user_clocked_in('USER_ID_HERE', 'SITE_ID_HERE');

-- Test getting managers on shift
SELECT * FROM get_managers_on_shift('SITE_ID_HERE', 'COMPANY_ID_HERE');

-- Test creating a ready notification manually
SELECT create_task_ready_notification(
  'TASK_ID_HERE',
  'COMPANY_ID_HERE',
  'SITE_ID_HERE',
  'USER_ID_HERE',
  'Test Task',
  '09:00'
);

-- Test creating a late notification manually
SELECT create_late_task_notification(
  'TASK_ID_HERE',
  'COMPANY_ID_HERE',
  'SITE_ID_HERE',
  'Test Task',
  '09:00',
  'ASSIGNED_USER_ID_HERE'
);
```

### Step 3: Check Tasks Due Today

```sql
-- Find tasks that should trigger notifications
SELECT
  ct.id,
  ct.custom_name,
  ct.due_date,
  ct.due_time,
  ct.assigned_to_user_id,
  ct.status,
  ct.company_id,
  ct.site_id,
  -- Check if user is clocked in
  EXISTS (
    SELECT 1 FROM attendance_logs a
    WHERE a.user_id = ct.assigned_to_user_id
      AND a.clock_out_at IS NULL
      AND a.clock_in_at::date = CURRENT_DATE
  ) as user_clocked_in,
  -- Check if managers are on shift
  (SELECT COUNT(*) FROM get_managers_on_shift(ct.site_id, ct.company_id)) as managers_on_shift
FROM checklist_tasks ct
WHERE ct.due_date = CURRENT_DATE
  AND ct.due_time IS NOT NULL
  AND ct.status IN ('pending', 'in_progress')
ORDER BY ct.due_time;
```

### Step 4: Manually Trigger the Edge Function

Test if the edge function works by calling it directly:

```bash
# Replace with your actual values
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/check-task-notifications \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

### Step 5: Check Notification Creation

```sql
-- Check if any notifications were created today
SELECT
  id,
  type,
  title,
  message,
  user_id,
  task_id,
  created_at,
  read
FROM notifications
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC;
```

---

## Quick Fixes

### Fix 1: Set Up Cron Job Properly

1. **Get your service role key** from Supabase Dashboard → Settings → API
2. **Update the migration file** `supabase/migrations/20250216000011_schedule_task_notification_cron.sql`:
   - Replace `YOUR_SERVICE_ROLE_KEY` with your actual key
   - Replace the hardcoded URL with your project URL
3. **Run the migration**:
   ```bash
   supabase db push
   ```
   Or run it manually in Supabase SQL Editor

### Fix 2: Ensure Tasks Have Required Fields

When creating tasks, ensure they have:

- `due_time` set (format: "HH:MM", e.g., "09:00")
- `assigned_to_user_id` set
- `due_date` set to today's date

### Fix 3: Ensure Users Clock In

Users need to use the clock-in feature before they can receive "ready" notifications.

### Fix 4: Deploy Edge Function

```bash
supabase functions deploy check-task-notifications
```

---

## Testing the System

### Test Scenario 1: Ready Notification

1. Create a task with:
   - `due_date` = today
   - `due_time` = current time + 30 minutes (so it's within the 1-hour window)
   - `assigned_to_user_id` = your user ID
   - Status = `pending`

2. Clock in as that user

3. Wait for the cron job to run (or trigger it manually)

4. Check notifications:
   ```sql
   SELECT * FROM notifications
   WHERE task_id = 'YOUR_TASK_ID'
     AND type = 'task_ready'
     AND created_at::date = CURRENT_DATE;
   ```

### Test Scenario 2: Late Notification

1. Create a task with:
   - `due_date` = today
   - `due_time` = current time - 2 hours (so it's past the 1-hour window)
   - `assigned_to_user_id` = a staff user ID
   - Status = `pending`

2. Clock in as a manager

3. Wait for the cron job to run (or trigger it manually)

4. Check notifications:
   ```sql
   SELECT * FROM notifications
   WHERE task_id = 'YOUR_TASK_ID'
     AND type = 'task_late'
     AND created_at::date = CURRENT_DATE;
   ```

---

## Files to Check

1. **Edge Function**: `supabase/functions/check-task-notifications/index.ts`
2. **Database Functions**: `supabase/migrations/20250216000009_create_notification_system.sql`
3. **Cron Setup**: `supabase/migrations/20250216000011_schedule_task_notification_cron.sql`
4. **Notifications Table**: `supabase/sql/notifications.sql`
5. **Display Component**: `src/components/dashboard/AlertsFeed.tsx`

---

## Next Steps

1. **Run the diagnostic queries** above to identify which issue is affecting you
2. **Fix the cron job setup** if it's not running
3. **Ensure tasks have required fields** (`due_time`, `assigned_to_user_id`)
4. **Test with a manual trigger** to verify the system works
5. **Check the AlertsFeed component** to ensure it's querying notifications correctly

---

## Summary

The notification system requires:

- ✅ Cron job running every 15 minutes
- ✅ Tasks with `due_time` and `assigned_to_user_id`
- ✅ Users clocked in (for ready notifications)
- ✅ Managers on shift (for late notifications)
- ✅ Database functions created
- ✅ Edge function deployed
- ✅ Notifications table has correct schema

Most likely, the cron job isn't set up correctly or tasks are missing the `due_time` field.
