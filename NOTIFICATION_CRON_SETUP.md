# Task Notification Cron Job Setup

## ✅ Edge Function Deployed Successfully!

The `check-task-notifications` edge function has been deployed successfully.

## Next Steps: Set Up Cron Job

You have **two options** for scheduling the notification checker:

### Option 1: Supabase Dashboard Scheduling (Recommended - Easier)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/xijoybubtrgbrhquqwrx)
2. Navigate to **Edge Functions** → **check-task-notifications**
3. Click **"Schedule"** or **"Add Schedule"**
4. Configure:
   - **Name**: `check-task-notifications-schedule`
   - **Cron Expression**: `*/15 * * * *` (Every 15 minutes)
   - **Authorization**: `Bearer YOUR_SERVICE_ROLE_KEY`
   - **Method**: `POST`
5. Click **"Save"**

**Advantages:**

- No SQL required
- Easy to manage via dashboard
- No need to handle service role key in SQL

### Option 2: Database-Level pg_cron (Alternative)

If you prefer using pg_cron, you'll need to:

1. **Update the migration** with your service role key:
   - Open `supabase/migrations/20250216000011_schedule_task_notification_cron.sql`
   - Replace `YOUR_SERVICE_ROLE_KEY` with your actual service role key
   - You can find this in: Dashboard → Settings → API → service_role key

2. **Run the migration**:

   ```bash
   supabase db push
   ```

3. **Verify it's scheduled**:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'check-task-notifications-cron';
   ```

## What the Cron Job Does

The cron job runs every 15 minutes and:

1. Checks all tasks due today with a `due_time`
2. For tasks entering the "ready" window (1hr before due time):
   - Creates notifications for assigned staff who are clocked in
3. For tasks past the "late" window (1hr after due time):
   - Creates notifications for managers on shift
4. Sends push notifications to subscribed users

## Testing

You can manually trigger the function to test it:

```bash
curl -X POST https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/check-task-notifications \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Or test it via the Supabase Dashboard:

1. Go to Edge Functions → check-task-notifications
2. Click "Invoke" or "Test"
3. Check the logs for results

## Troubleshooting

### Cron job not running?

- Check cron job exists: `SELECT * FROM cron.job WHERE jobname = 'check-task-notifications-cron';`
- Check cron job runs: `SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'check-task-notifications-cron') ORDER BY start_time DESC LIMIT 10;`

### Notifications not being created?

- Verify users are clocked in (for ready notifications)
- Verify managers are on shift (for late notifications)
- Check function logs in Supabase Dashboard
- Verify the SQL functions exist: `create_task_ready_notification` and `create_late_task_notification`
