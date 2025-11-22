# Task Generation Automation Setup

## Overview

This document explains how to set up **automated task generation** that runs every day at **3:00 AM UTC** to populate today's tasks using Supabase Edge Functions.

## Recommended Approach: Database-Level Scheduling via pg_cron

This method uses `pg_cron` within your database to trigger the Edge Function. This is robust and keeps the schedule definition in your database.

### Prerequisites

1.  **Enable Extensions**: Ensure `pg_cron` and `pg_net` are enabled in your Supabase project.
2.  **Get Service Role Key**: Find this in your Supabase Dashboard > Project Settings > API.

### Steps

1.  **Run the following SQL in your Supabase SQL Editor**:

```sql
-- 1. Enable required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Schedule the Edge Function
-- REPLACE [YOUR_SERVICE_ROLE_KEY] below with your actual secret key
select cron.schedule(
  'generate-daily-tasks-edge-function', -- Job name
  '0 3 * * *',                          -- Schedule (3:00 AM UTC)
  $$
  select
    net.http_post(
        url:='https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/generate-daily-tasks',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer [YOUR_SERVICE_ROLE_KEY]"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
```

2.  **Verify**:
    ```sql
    select * from cron.job;
    ```

## What the Automation Does

1. **Runs every day at 3:00 AM UTC**
2. **Generates tasks for all active templates**:
   - Daily tasks (every day)
   - Weekly tasks (on specified days)
   - Monthly tasks (on specified dates)
3. **Handles multiple dayparts**:
   - Creates one task per daypart
   - Example: Template with 3 dayparts = 3 separate tasks
4. **Prevents duplicates**:
   - Checks existing tasks before creating
   - Only creates missing daypart instances
5. **Stores dayparts in task_data**:
   - All dayparts stored in `task_data.dayparts` array
   - Each task instance has its specific daypart set

## Manual Trigger (For Testing)

If you need to manually trigger task generation:

### Via SQL:

```sql
SELECT * FROM generate_daily_tasks_direct();
```

### Via API (if Edge Function is deployed):

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/generate-daily-tasks \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

## Troubleshooting

### Tasks not generating?

1. **Check cron job status**:

   ```sql
   SELECT * FROM cron.job WHERE jobname = 'generate-daily-tasks-cron';
   ```

2. **Check function exists**:

   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_name = 'generate_daily_tasks_direct';
   ```

3. **Check for errors**:

   ```sql
   SELECT * FROM cron.job_run_details
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'generate-daily-tasks-cron')
   ORDER BY start_time DESC LIMIT 10;
   ```

4. **Verify templates exist and are active**:

   ```sql
   SELECT id, name, frequency, is_active, dayparts
   FROM task_templates
   WHERE is_active = true;
   ```

5. **Verify sites exist**:
   ```sql
   SELECT id, name, is_active FROM sites WHERE is_active = true;
   ```

### Tasks generating but not showing on Today's page?

- Check that `due_date = CURRENT_DATE`
- Verify tasks have dayparts set
- Check that tasks aren't filtered out (completed, callout_followup, etc.)

## Timezone Note

The cron job runs at **3:00 AM UTC**. If you need a different timezone:

- Adjust the cron expression (e.g., `0 3 * * *` = 3am UTC)
- Or convert your desired local time to UTC

Example: If you want 3am GMT (UK time):

- GMT is UTC+0 in winter, UTC+1 in summer
- Use `0 3 * * *` for 3am GMT (winter)
- Use `0 2 * * *` for 3am GMT (summer, which is 2am UTC)

## Next Steps After Setup

1. ✅ Wait for first run at 3am (or trigger manually to test)
2. ✅ Check Today's Tasks page - should see all tasks for today
3. ✅ Verify tasks are sorted chronologically by daypart
4. ✅ Verify multiple dayparts create multiple task instances
