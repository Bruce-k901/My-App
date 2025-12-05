# Mark Overdue Tasks Edge Function - Deployment Guide

## Overview

The `mark-overdue-tasks` Edge Function automatically marks tasks as overdue based on their completion windows. It runs hourly and updates task status from `pending` to `overdue` when tasks exceed their completion window.

## Completion Windows

| Task Type        | Window                   | Example                                 |
| ---------------- | ------------------------ | --------------------------------------- |
| Daily            | 1 hour after `due_time`  | Task due at 09:00 → overdue at 10:00    |
| Weekly           | 1 day after `due_date`   | Task due on Monday → overdue on Tuesday |
| Monthly          | 1 week after `due_date`  | Task due on 1st → overdue on 8th        |
| Annual/Bi-annual | 1 month after `due_date` | Task due on Jan 1 → overdue on Feb 1    |
| PPM              | 1 month after `due_date` | Task due on Jan 1 → overdue on Feb 1    |
| Callout          | 1 day after `due_date`   | Task due on Monday → overdue on Tuesday |
| Certificate      | 1 day after `due_date`   | Task due on Monday → overdue on Tuesday |
| SOP Review       | 1 day after `due_date`   | Task due on Monday → overdue on Tuesday |
| RA Review        | 1 day after `due_date`   | Task due on Monday → overdue on Tuesday |
| Document         | 1 day after `due_date`   | Task due on Monday → overdue on Tuesday |
| Messaging        | 1 day after `due_date`   | Task due on Monday → overdue on Tuesday |

## Deployment Steps

### 1. Deploy Edge Function

The function is already created at `supabase/functions/mark-overdue-tasks/index.ts`. Deploy it:

```powershell
# Navigate to project root
cd C:\Users\bruce\my-app

# Deploy the function
supabase functions deploy mark-overdue-tasks
```

**Expected Output:**

```
Deploying function mark-overdue-tasks...
Function deployed successfully!
```

### 2. Set Up Cron Job

The function should run **every hour** to check for overdue tasks.

#### Option A: Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard** → **Database** → **Cron Jobs**
2. Click **"New Cron Job"**
3. Configure:
   - **Name**: `mark-overdue-tasks`
   - **Schedule**: `0 * * * *` (every hour at minute 0)
   - **Command**:
   ```sql
   SELECT net.http_post(
     url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/mark-overdue-tasks',
     headers := jsonb_build_object(
       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
     )
   );
   ```

   - **Enabled**: ✅ Checked

#### Option B: SQL Editor

Run this SQL in Supabase SQL Editor:

```sql
-- Create cron job to run every hour
SELECT cron.schedule(
  'mark-overdue-tasks',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/mark-overdue-tasks',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )
  );
  $$
);
```

**Replace `YOUR_PROJECT_REF`** with your actual Supabase project reference (found in your project URL).

### 3. Get Service Role Key

To get your service role key:

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Copy the **`service_role`** key (NOT the anon key)
3. Use it in the cron job command above

**⚠️ Security Note**: The service role key has full database access. Never expose it in client-side code.

### 4. Test the Function

#### Manual Test (PowerShell)

```powershell
# Set your anon key (for testing)
$anonKey = "YOUR_ANON_KEY"

# Set headers
$headers = @{
    "Authorization" = "Bearer $anonKey"
    "Content-Type" = "application/json"
}

# Call the function
$response = Invoke-RestMethod `
    -Uri "https://YOUR_PROJECT_REF.supabase.co/functions/v1/mark-overdue-tasks" `
    -Method Post `
    -Headers $headers

# Display response
$response | ConvertTo-Json -Depth 10
```

**Expected Response:**

```json
{
  "success": true,
  "timestamp": "2025-02-21T14:00:00.000Z",
  "daily_tasks_marked": 2,
  "weekly_tasks_marked": 0,
  "monthly_tasks_marked": 0,
  "annual_tasks_marked": 0,
  "ppm_tasks_marked": 0,
  "callout_tasks_marked": 1,
  "certificate_tasks_marked": 0,
  "sop_tasks_marked": 0,
  "ra_tasks_marked": 0,
  "document_tasks_marked": 0,
  "messaging_tasks_marked": 0,
  "total_tasks_marked": 3,
  "errors": []
}
```

#### Verify in Database

```sql
-- Check for overdue tasks
SELECT
  id,
  custom_name,
  status,
  due_date,
  due_time,
  updated_at
FROM checklist_tasks
WHERE status = 'overdue'
ORDER BY updated_at DESC
LIMIT 10;
```

## UI Updates

The UI has been updated to highlight overdue tasks:

### TaskCard Component

- **Red border and background**: `border-red-600/60 bg-red-600/20`
- **Pulsing alert icon**: Red AlertCircle icon with animation
- **"OVERDUE" badge**: Red text badge next to task name
- **Bold text**: Task name is bold and red-tinted

### Visual Indicators

1. **Card Border**: Red border with shadow (`border-red-600/60 bg-red-600/20 shadow-red-600/20`)
2. **Icon**: Pulsing red AlertCircle icon
3. **Text**: Red-tinted, bold task name with "OVERDUE" badge
4. **Priority**: Overdue styling takes precedence over other status indicators

## Monitoring

### Check Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions** → **mark-overdue-tasks**
2. Click **"Logs"** tab
3. View execution history and errors

### Verify Cron Job

```sql
-- Check cron job status
SELECT * FROM cron.job WHERE jobname = 'mark-overdue-tasks';

-- Check cron job run history
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'mark-overdue-tasks')
ORDER BY start_time DESC
LIMIT 10;
```

### Monitor Overdue Tasks

```sql
-- Count overdue tasks by type
SELECT
  COUNT(*) FILTER (WHERE site_checklist_id IS NOT NULL) as configured_tasks,
  COUNT(*) FILTER (WHERE task_data->>'source_type' = 'ppm_overdue') as ppm_tasks,
  COUNT(*) FILTER (WHERE task_data->>'source_type' = 'callout_followup') as callout_tasks,
  COUNT(*) FILTER (WHERE task_data->>'source_type' = 'certificate_expiry') as certificate_tasks,
  COUNT(*) FILTER (WHERE task_data->>'source_type' = 'sop_review') as sop_tasks,
  COUNT(*) FILTER (WHERE task_data->>'source_type' = 'ra_review') as ra_tasks,
  COUNT(*) FILTER (WHERE task_data->>'source_type' = 'document_expiry') as document_tasks,
  COUNT(*) FILTER (WHERE task_data->>'source_type' = 'messaging_task') as messaging_tasks,
  COUNT(*) as total_overdue
FROM checklist_tasks
WHERE status = 'overdue';
```

## Troubleshooting

### Function Not Running

1. **Check cron job is enabled**:

   ```sql
   SELECT * FROM cron.job WHERE jobname = 'mark-overdue-tasks';
   ```

   Ensure `active = true`

2. **Check function exists**:

   ```sql
   SELECT * FROM supabase_functions.functions WHERE name = 'mark-overdue-tasks';
   ```

3. **Check logs for errors**:
   - Supabase Dashboard → Edge Functions → mark-overdue-tasks → Logs

### Tasks Not Being Marked Overdue

1. **Verify task status**:
   - Only tasks with `status = 'pending'` are marked overdue
   - Already completed or overdue tasks are skipped

2. **Check completion windows**:
   - Daily tasks: Must be 1+ hour past `due_time`
   - Weekly/Monthly/Annual: Must be past the window date

3. **Verify task data**:
   - System-generated tasks must have correct `task_data.source_type`
   - Configured tasks must have valid `site_checklist_id` and frequency

### UI Not Showing Overdue Styling

1. **Refresh the page**: Overdue status is set by Edge Function, may need refresh
2. **Check task status**: Verify `task.status === 'overdue'` in database
3. **Clear browser cache**: Ensure latest component code is loaded

## Next Steps

1. ✅ Deploy Edge Function
2. ✅ Set up cron job (runs hourly)
3. ✅ Test manually
4. ✅ Verify UI highlights overdue tasks
5. ✅ Monitor logs for first few runs

## Related Functions

- **`generate-daily-tasks`**: Creates new tasks daily
- **`mark-overdue-tasks`**: Marks tasks as overdue (this function)

Both functions work together to maintain task status automatically.
