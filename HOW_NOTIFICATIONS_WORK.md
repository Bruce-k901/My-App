# How Notifications Work & How to Test Them

## Overview

Your notification system creates notifications for tasks that are:

- Due today (`due_date = CURRENT_DATE`)
- Have a `due_time` set (e.g., "09:00", "14:30")
- Have `assigned_to_user_id` set
- Status is `pending` or `in_progress`
- Are NOT cron-generated (`task_data->>'source' != 'cron'`)

## How Notifications Are Created

### 1. **Ready Notifications** (1 hour BEFORE due time)

- Created when: Current time is within 1 hour before the task's `due_time`
- Example: Task due at 09:00 → Notification created between 08:00-09:00
- **Requirement**: The assigned user must be clocked in
- Sent to: The assigned user (`assigned_to_user_id`)

### 2. **Late Notifications** (1 hour AFTER due time)

- Created when: Current time is more than 1 hour after the task's `due_time`
- Example: Task due at 09:00 → Notification created after 10:00
- **Requirement**: At least one manager must be on shift
- Sent to: All managers who are clocked in at that site

## Where Notifications Appear

Notifications appear in **two places**:

### 1. **AlertsFeed Component** (`/dashboard`)

- Located on your main dashboard page
- Shows all notifications for your company
- Displays: Overdue tasks, late tasks, missed tasks, temperature breaches, and notifications from the `notifications` table
- Updates in real-time via Supabase realtime subscriptions

### 2. **Notifications Table** (Database)

- Stored in the `notifications` table
- Can be queried via SQL
- Used by the AlertsFeed component to display alerts

## How to Test Notifications

### Step 1: Verify Tasks Are Ready

Run this query to see which tasks should trigger notifications:

```sql
-- Check tasks that should trigger notifications RIGHT NOW
SELECT
  ct.id,
  ct.custom_name,
  ct.due_time,
  ct.assigned_to_user_id,
  -- Check if user is clocked in
  EXISTS (
    SELECT 1 FROM attendance_logs a
    WHERE a.user_id = ct.assigned_to_user_id
      AND a.clock_out_at IS NULL
      AND a.clock_in_at::date = CURRENT_DATE
  ) as user_clocked_in,
  -- Calculate notification window
  CASE
    WHEN ct.due_time IS NOT NULL THEN
      CASE
        -- Ready window: 1 hour before due time
        WHEN (EXTRACT(HOUR FROM NOW()) * 60 + EXTRACT(MINUTE FROM NOW())) >=
             (CAST(SPLIT_PART(ct.due_time, ':', 1) AS INTEGER) * 60 +
              CAST(SPLIT_PART(ct.due_time, ':', 2) AS INTEGER) - 60)
         AND (EXTRACT(HOUR FROM NOW()) * 60 + EXTRACT(MINUTE FROM NOW())) <
             (CAST(SPLIT_PART(ct.due_time, ':', 1) AS INTEGER) * 60 +
              CAST(SPLIT_PART(ct.due_time, ':', 2) AS INTEGER))
        THEN 'READY_WINDOW (notification should be created)'
        -- Late window: 1 hour after due time
        WHEN (EXTRACT(HOUR FROM NOW()) * 60 + EXTRACT(MINUTE FROM NOW())) >
             (CAST(SPLIT_PART(ct.due_time, ':', 1) AS INTEGER) * 60 +
              CAST(SPLIT_PART(ct.due_time, ':', 2) AS INTEGER) + 60)
        THEN 'LATE_WINDOW (late notification should be created)'
        ELSE 'OUTSIDE_WINDOW (no notification yet)'
      END
    ELSE 'NO_DUE_TIME'
  END as notification_status,
  CURRENT_TIME as current_time
FROM checklist_tasks ct
WHERE ct.due_date = CURRENT_DATE
  AND ct.status IN ('pending', 'in_progress')
  AND ct.due_time IS NOT NULL
  AND NOT (ct.task_data IS NOT NULL AND ct.task_data->>'source' = 'cron')
ORDER BY ct.due_time;
```

### Step 2: Ensure User is Clocked In

For "ready" notifications to work, the assigned user must be clocked in:

```sql
-- Check if users are clocked in
SELECT
  p.id,
  p.full_name,
  p.email,
  a.clock_in_at,
  a.clock_out_at,
  CASE
    WHEN a.clock_out_at IS NULL AND a.clock_in_at::date = CURRENT_DATE THEN '✅ Clocked in'
    ELSE '❌ Not clocked in'
  END as status
FROM profiles p
LEFT JOIN attendance_logs a ON a.user_id = p.id
  AND a.clock_out_at IS NULL
  AND a.clock_in_at::date = CURRENT_DATE
WHERE p.id IN (
  SELECT DISTINCT assigned_to_user_id
  FROM checklist_tasks
  WHERE due_date = CURRENT_DATE
  AND due_time IS NOT NULL
)
ORDER BY a.clock_in_at DESC NULLS LAST;
```

### Step 3: Manually Trigger the Notification Cron

The cron runs every 15 minutes automatically, but you can test it manually:

**Option A: Call the Edge Function Directly**

```bash
# Replace YOUR_PROJECT_ID and YOUR_SERVICE_ROLE_KEY
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/check-task-notifications \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

**Option B: Use Supabase Dashboard**

1. Go to Edge Functions → `check-task-notifications`
2. Click "Invoke" button
3. Check the response for how many notifications were created

### Step 4: Check if Notifications Were Created

```sql
-- Check notifications created today
SELECT
  id,
  type,
  title,
  message,
  user_id,
  task_id,
  severity,
  read,
  created_at
FROM notifications
WHERE created_at::date = CURRENT_DATE
ORDER BY created_at DESC;

-- Count by type
SELECT
  type,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE read = false) as unread_count
FROM notifications
WHERE created_at::date = CURRENT_DATE
GROUP BY type
ORDER BY count DESC;
```

### Step 5: View in AlertsFeed

1. Go to your dashboard (`/dashboard`)
2. Look for the **AlertsFeed** component
3. You should see notifications appear there
4. They update automatically via realtime subscriptions

## Testing Scenarios

### Scenario 1: Test Ready Notification

1. **Create a test task**:

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

2. **Clock in as that user** (via your app's clock-in feature)

3. **Wait for cron to run** (or trigger it manually)

4. **Check notifications**:
   ```sql
   SELECT * FROM notifications
   WHERE task_id = 'YOUR_TASK_ID'
   AND type = 'task_ready';
   ```

### Scenario 2: Test Late Notification

1. **Create a test task** with `due_time` = 2 hours ago

2. **Clock in as a manager**

3. **Trigger the cron manually**

4. **Check notifications** - should see `type = 'task_late'` for managers

## Troubleshooting

### No Notifications Created?

1. **Check cron job is running**:

   ```sql
   SELECT * FROM cron.job_run_details
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-task-notifications-cron')
   ORDER BY start_time DESC LIMIT 5;
   ```

2. **Check edge function logs**:
   - Go to Supabase Dashboard → Edge Functions → `check-task-notifications`
   - Check "Logs" tab for errors

3. **Verify tasks meet criteria**:
   - `due_date = CURRENT_DATE` ✓
   - `due_time IS NOT NULL` ✓
   - `assigned_to_user_id IS NOT NULL` ✓
   - `status IN ('pending', 'in_progress')` ✓
   - NOT cron-generated ✓

4. **Check user is clocked in** (for ready notifications)

5. **Check managers are on shift** (for late notifications)

### Notifications Created But Not Showing?

1. **Check AlertsFeed component** is loading notifications:
   - Open browser console
   - Look for errors when AlertsFeed loads

2. **Check RLS policies**:

   ```sql
   -- Verify you can see notifications
   SELECT COUNT(*) FROM notifications
   WHERE company_id = 'YOUR_COMPANY_ID';
   ```

3. **Check realtime subscription**:
   - AlertsFeed subscribes to changes
   - Check browser console for subscription errors

## Notification Types

- `task_ready` - Task is ready to complete (1hr before due time)
- `task_late` - Task is late (1hr after due time)
- `incident` - New incident created
- `temperature` - Temperature warning
- `ppm_due_soon` - PPM due soon
- `ppm_overdue` - PPM overdue
- `digest` - Daily digest

## Summary

**Notifications are created by:**

- Cron job running every 15 minutes
- Edge function: `check-task-notifications`
- Database functions: `create_task_ready_notification()`, `create_late_task_notification()`

**Notifications appear in:**

- AlertsFeed component on dashboard
- `notifications` table in database

**To test:**

1. Ensure tasks have `due_time` ✓ (you've done this)
2. Ensure users are clocked in
3. Trigger cron manually or wait for it to run
4. Check `notifications` table
5. View AlertsFeed on dashboard












