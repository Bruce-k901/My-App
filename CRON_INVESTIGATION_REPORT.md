# Daily Task Edge Function Investigation Report

**Date**: 2025-11-23\
**Issue**: Edge function did not run at expected time of 3am BST

## 🔍 Root Cause Analysis

### Current System Architecture

The task generation system has **TWO** separate mechanisms:

1. **Database-Level Cron (pg_cron)**
   - Status: ❌ **DISABLED** (as of migration
     `20250222000001_disable_db_cron.sql`)
   - Reason: Was creating incomplete tasks without equipment_config
   - Job name: `generate-daily-tasks-cron`

2. **Edge Function Schedule (Supabase Dashboard)**
   - Status: ❓ **UNKNOWN** - Needs verification
   - Function: `generate-daily-tasks`
   - Location: `supabase/functions/generate-daily-tasks/index.ts`
   - Expected schedule: `0 3 * * *` (3:00 AM UTC)

### Why It Didn't Run

The database cron was intentionally disabled, and the Edge Function schedule may
not be properly configured in the Supabase Dashboard.

## ✅ Resolution Steps

### Step 1: Verify Edge Function Deployment

Check if the Edge Function is deployed:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select project: `xijoybubtrgbrhquqwrx`
3. Navigate to: **Edge Functions**
4. Look for: `generate-daily-tasks`

### Step 2: Check/Create Edge Function Schedule

In the Supabase Dashboard:

1. Click on `generate-daily-tasks` function
2. Look for **"Schedules"** or **"Cron"** tab
3. Check if a schedule exists

**If NO schedule exists, create one:**

- **Name**: `daily-task-generation`
- **Cron Expression**: `0 3 * * *` (3:00 AM UTC every day)
- **HTTP Method**: `POST`
- **Authorization Header**:
  - Key: `Authorization`
  - Value: `Bearer YOUR_SERVICE_ROLE_KEY`

  ⚠️ **Important**: Get the service role key from Settings → API → service_role
  key (secret)

### Step 3: Time Zone Clarification

- **BST (British Summer Time)**: UTC+1 (March-October)
- **GMT (Greenwich Mean Time)**: UTC+0 (November-March)
- **Current**: We're in GMT, so 3am GMT = 3am UTC
- **Cron Expression**: `0 3 * * *` runs at 3:00 AM UTC

### Step 4: Manual Test

Test the Edge Function manually to ensure it works:

```powershell
# Replace YOUR_SERVICE_ROLE_KEY with actual key from Supabase Dashboard
$headers = @{
    "Authorization" = "Bearer YOUR_SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
}

$response = Invoke-RestMethod -Uri "https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/generate-daily-tasks" -Method Post -Headers $headers
$response | ConvertTo-Json -Depth 10
```

**Expected Response:**

```json
{
  "success": true,
  "daily_tasks_created": X,
  "weekly_tasks_created": X,
  "monthly_tasks_created": X,
  "errors": []
}
```

### Step 5: Verify Tasks Were Created

After manual test, check database:

```sql
SELECT COUNT(*) as task_count, due_date
FROM checklist_tasks
WHERE due_date = CURRENT_DATE
GROUP BY due_date;
```

## 🎯 Recommended Solution

**Option A: Use Edge Function Schedule (Recommended)**

This is the current intended approach:

1. ✅ Keep database cron disabled
2. ✅ Configure Edge Function schedule in Supabase Dashboard
3. ✅ Monitor Edge Function logs after each run

**Pros:**

- More flexible and easier to debug
- Better logging and monitoring
- Can be tested independently
- No database function dependencies

**Option B: Re-enable Database Cron**

Only if Edge Function scheduling is not available:

1. Create a new migration to re-enable the database cron
2. Ensure it calls the Edge Function via HTTP
3. Use `net.http_post` to trigger the Edge Function

**Pros:**

- More reliable (runs within database)
- No dependency on external scheduling

**Cons:**

- Requires pg_cron extension
- Less flexible
- Harder to debug

## 📋 Action Items

- [ ] Verify Edge Function is deployed in Supabase Dashboard
- [ ] Check if Edge Function schedule exists
- [ ] Create schedule if missing (3:00 AM UTC daily)
- [ ] Test Edge Function manually
- [ ] Monitor logs tomorrow at 3:00 AM UTC
- [ ] Verify tasks are created automatically

## 📚 Reference Documentation

- Edge Function code: `supabase/functions/generate-daily-tasks/index.ts`
- Deployment guide: `EDGE_FUNCTION_DEPLOYMENT_GUIDE.md`
- Cron setup: `docs/CRON_SETUP_INSTRUCTIONS.md`
- Disable cron migration:
  `supabase/migrations/20250222000001_disable_db_cron.sql`
