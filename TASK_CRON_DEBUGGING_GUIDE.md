# Task Cron Debugging Guide

## 🔍 Quick Diagnostic Queries

### Check if cron is running

```sql
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-task-notifications-cron')
ORDER BY start_time DESC
LIMIT 10;
```

### Check recent notifications created

```sql
SELECT
  id,
  type,
  title,
  created_at,
  user_id,
  task_id,
  push_sent,
  read
FROM notifications
WHERE type IN ('task_ready', 'task_late')
ORDER BY created_at DESC
LIMIT 20;
```

### Check tasks that should trigger notifications

```sql
SELECT
  ct.id,
  ct.due_date,
  ct.due_time,
  ct.status,
  ct.assigned_to_user_id,
  ct.company_id,
  ct.site_id,
  tt.name as task_name,
  -- Check if user is clocked in
  EXISTS (
    SELECT 1 FROM attendance_logs al
    WHERE al.user_id = ct.assigned_to_user_id
      AND al.clock_out_at IS NULL
      AND al.clock_in_at::date = CURRENT_DATE
  ) as user_clocked_in
FROM checklist_tasks ct
LEFT JOIN task_templates tt ON tt.id = ct.template_id
WHERE ct.due_date = CURRENT_DATE
  AND ct.status IN ('pending', 'in_progress')
  AND ct.due_time IS NOT NULL
ORDER BY ct.due_time;
```

### Check if database functions exist

```sql
SELECT
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'create_task_ready_notification',
    'create_late_task_notification',
    'is_user_clocked_in',
    'get_managers_on_shift'
  )
ORDER BY routine_name;
```

### Check for managers on shift

```sql
-- Replace with actual site_id
SELECT * FROM get_managers_on_shift('YOUR_SITE_ID'::uuid, 'YOUR_COMPANY_ID'::uuid);
```

### Check if user is clocked in

```sql
-- Replace with actual user_id and site_id
SELECT is_user_clocked_in('YOUR_USER_ID'::uuid, 'YOUR_SITE_ID'::uuid);
```

### Check notification table structure

```sql
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'notifications'
ORDER BY ordinal_position;
```

## 🐛 Common Issues & Fixes

### Issue: Cron not running

**Symptoms:**

- No logs in Supabase Dashboard
- No notifications being created

**Diagnosis:**

```sql
-- Check if cron job exists
SELECT * FROM cron.job WHERE jobname = 'check-task-notifications-cron';

-- Check last run
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-task-notifications-cron')
ORDER BY start_time DESC LIMIT 1;
```

**Fixes:**

1. Verify cron job is scheduled:

   ```sql
   SELECT cron.schedule(
     'check-task-notifications-cron',
     '*/15 * * * *',
     $$SELECT net.http_post(...)$$
   );
   ```

2. Check if pg_cron extension is enabled:
   ```sql
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

### Issue: RPC function errors

**Symptoms:**

- Errors in logs: "RPC error creating ready notification"
- `errors_count > 0` in response

**Diagnosis:**

```sql
-- Test the function directly
SELECT create_task_ready_notification(
  'TASK_ID'::uuid,
  'COMPANY_ID'::uuid,
  'SITE_ID'::uuid,
  'USER_ID'::uuid,
  'Test Task',
  '14:00'
);
```

**Fixes:**

1. Verify function exists (see query above)
2. Check function permissions:

   ```sql
   SELECT
     routine_name,
     security_type
   FROM information_schema.routines
   WHERE routine_name = 'create_task_ready_notification';
   ```

   Should be `SECURITY DEFINER`

3. Check RLS policies on notifications table:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'notifications';
   ```

### Issue: No notifications created (but tasks exist)

**Symptoms:**

- Tasks found but `notifications_created: 0`
- No errors in logs

**Diagnosis:**

1. Check if users are clocked in:

   ```sql
   SELECT
     ct.id as task_id,
     ct.assigned_to_user_id,
     is_user_clocked_in(ct.assigned_to_user_id, ct.site_id) as clocked_in
   FROM checklist_tasks ct
   WHERE ct.due_date = CURRENT_DATE
     AND ct.status IN ('pending', 'in_progress');
   ```

2. Check if managers are on shift (for late notifications):
   ```sql
   SELECT * FROM get_managers_on_shift('SITE_ID'::uuid, 'COMPANY_ID'::uuid);
   ```

**Fixes:**

- Notifications only sent to clocked-in users (by design)
- Late notifications only sent if managers are on shift
- This is expected behavior, not a bug

### Issue: Invalid time format errors

**Symptoms:**

- Warnings: "Invalid time format"
- Tasks skipped

**Diagnosis:**

```sql
SELECT
  id,
  due_time,
  due_date
FROM checklist_tasks
WHERE due_time IS NOT NULL
  AND due_time !~ '^[0-9]{2}:[0-9]{2}$';
```

**Fixes:**

- Fix data: Update tasks with invalid time formats
- Ensure time format is HH:MM (e.g., "14:30")

### Issue: Missing task_id column

**Symptoms:**

- Errors: "column task_id does not exist"
- RPC functions fail

**Diagnosis:**

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'notifications'
  AND column_name = 'task_id';
```

**Fixes:**

```sql
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.checklist_tasks(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_task_id
  ON public.notifications(task_id)
  WHERE task_id IS NOT NULL;
```

## 📊 Monitoring Queries

### Success rate over time

```sql
-- This would require a logs table or external monitoring
-- For now, check notification creation rate:
SELECT
  DATE(created_at) as date,
  type,
  COUNT(*) as count
FROM notifications
WHERE type IN ('task_ready', 'task_late')
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at), type
ORDER BY date DESC, type;
```

### Tasks without notifications

```sql
SELECT
  ct.id,
  ct.due_date,
  ct.due_time,
  ct.status,
  CASE
    WHEN ct.due_time IS NULL THEN 'No due_time'
    WHEN ct.assigned_to_user_id IS NULL THEN 'No assigned user'
    WHEN NOT is_user_clocked_in(ct.assigned_to_user_id, ct.site_id) THEN 'User not clocked in'
    ELSE 'Should have notification'
  END as reason
FROM checklist_tasks ct
WHERE ct.due_date = CURRENT_DATE
  AND ct.status IN ('pending', 'in_progress')
  AND ct.due_time IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM notifications n
    WHERE n.task_id = ct.id
      AND n.created_at::date = CURRENT_DATE
  );
```

## 🚨 Emergency Fixes

### Reset all push_sent flags (if push notifications stuck)

```sql
UPDATE notifications
SET push_sent = false
WHERE push_sent = true
  AND created_at >= CURRENT_DATE - INTERVAL '1 day';
```

### Manually trigger notification creation

```sql
-- For a specific task
SELECT create_task_ready_notification(
  'TASK_ID'::uuid,
  'COMPANY_ID'::uuid,
  'SITE_ID'::uuid,
  'USER_ID'::uuid,
  'Task Name',
  '14:00'
);
```

### Check edge function logs

1. Go to Supabase Dashboard
2. Edge Functions → check-task-notifications
3. Click "Logs" tab
4. Filter by time range
5. Look for [ERROR] entries

## 📝 Testing Checklist

- [ ] Cron job exists and is scheduled
- [ ] Database functions exist and are SECURITY DEFINER
- [ ] Notifications table has task_id column
- [ ] RLS policies allow service role access
- [ ] Test users are clocked in
- [ ] Test tasks have valid due_time format
- [ ] Edge function environment variables set
- [ ] Manual function call succeeds
- [ ] Cron runs without errors
- [ ] Notifications are created correctly
