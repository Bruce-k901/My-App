# Task Generation Automation Setup

## Overview

This document explains how to set up **automated task generation** that runs every day at **3:00 AM UTC** to populate today's tasks.

## Two Approaches

### Option 1: Supabase Dashboard Scheduling (Recommended)

Supabase has built-in scheduling for Edge Functions. This is the easiest and most reliable method.

#### Steps:

1. **Deploy the Edge Function** (if not already deployed):

   ```bash
   supabase functions deploy generate-daily-tasks
   ```

2. **Set up Schedule in Supabase Dashboard**:
   - Go to your Supabase Dashboard
   - Navigate to **Edge Functions** → **generate-daily-tasks**
   - Click **"Schedule"** or **"Add Schedule"**
   - Configure:
     - **Name**: `daily-task-generation`
     - **Cron Expression**: `0 3 * * *` (3:00 AM UTC every day)
     - **Authorization**: `Bearer YOUR_SERVICE_ROLE_KEY`
     - **Method**: `POST`
   - Click **"Save"**

3. **Verify**:
   - The schedule will appear in the Edge Functions schedules list
   - Check the function logs after 3am to verify it ran

### Option 2: Database-Level pg_cron (Alternative)

If pg_cron extension is enabled in your Supabase project, you can use the SQL migration.

#### Steps:

1. **Run the migration**:

   ```bash
   supabase db push
   ```

   Or manually run: `supabase/migrations/20250202000003_setup_task_generation_cron.sql`

2. **Verify cron job exists**:

   ```sql
   SELECT * FROM cron.job WHERE jobname = 'generate-daily-tasks-cron';
   ```

3. **Test manually** (optional):
   ```sql
   SELECT generate_daily_tasks_direct();
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
