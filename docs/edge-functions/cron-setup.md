# Supabase Cron Setup for Daily Task Generation

## Prerequisites

- ✅ Edge Function `generate-daily-tasks` is deployed
- ✅ At least 1 active task template exists in database
- ✅ At least 1 active site exists in database

## Setup Steps

### 1. Access Supabase Dashboard

- Go to: https://supabase.com/dashboard
- Select project: `xijoybubtrgbrhquqwrx`

### 2. Navigate to Edge Functions

- Left sidebar → Click "Edge Functions"
- Find function: `generate-daily-tasks`
- Click on the function name

### 3. Create Cron Schedule

Click "Add Schedule" or "Cron" button and configure:

**Schedule Settings:**

- **Name**: `daily-task-generation`
- **Cron Expression**: `0 0 * * *` (midnight UTC daily)
- **Function**: `generate-daily-tasks`
- **Timezone**: `UTC`
- **Enabled**: `Yes`

### 4. Add Authorization Header

**Critical**: The cron needs authorization to call the Edge Function.

1. Go to: Settings → API
2. Copy the "anon public" key
3. Back in cron settings, add HTTP Header:
   - **Key**: `Authorization`
   - **Value**: `Bearer YOUR_ANON_KEY_HERE`

   ⚠️ Format must be: `Bearer YOUR_KEY` (with space after Bearer)

### 5. Save and Enable

- Click "Save" or "Create"
- Verify schedule appears as "Enabled" in the list

## Verification

### Test Manually (Optional)

```bash
curl -X POST https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/generate-daily-tasks \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

**Expected response:**

```json
{
  "success": true,
  "daily_tasks_created": 5,
  "weekly_tasks_created": 0,
  "monthly_tasks_created": 0,
  "triggered_tasks_created": 0,
  "errors": []
}
```

### Check Generated Tasks

```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) as task_count
FROM checklist_tasks
WHERE due_date = CURRENT_DATE;
```

### Monitor Logs

After midnight, check:

- Dashboard → Edge Functions → generate-daily-tasks → Logs
- Look for entry at 00:00:00
- Verify no errors

## Troubleshooting

### Issue: No tasks generated

1. Check Edge Function logs for errors
2. Verify active templates exist:
   ```sql
   SELECT COUNT(*) FROM task_templates WHERE is_active = true;
   ```
3. Verify active sites exist:
   ```sql
   SELECT COUNT(*) FROM sites WHERE is_active = true;
   ```

### Issue: Duplicate tasks

Run duplicate check:

```sql
SELECT due_date, template_id, site_id, COUNT(*) as count
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
GROUP BY due_date, template_id, site_id
HAVING COUNT(*) > 1;
```

If duplicates found, the cron may be running multiple times. Check for duplicate schedules in Supabase Dashboard.

## Success Indicators

- ✅ Cron schedule shows "Enabled" in Supabase
- ✅ Tasks appear automatically each morning
- ✅ Edge Function logs show successful runs at 00:00
- ✅ No duplicate tasks created
- ✅ Users see today's tasks in the UI
