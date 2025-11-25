# 🔍 Daily Tasks Edge Function - Deep Dive Investigation

## Problem Statement

The `generate-daily-tasks` Edge Function is not running automatically at the scheduled time (3:00 AM UTC). Manual triggers work, but the automated schedule is not executing.

## Root Cause Analysis

Based on the codebase investigation, there are **three potential scheduling mechanisms**, and it appears **none are properly configured**:

### 1. Database-Level Cron (pg_cron) - **DISABLED**

**Status**: ❌ Intentionally disabled

**Evidence**:

- Migration `20250222000001_disable_db_cron.sql` explicitly disabled the database cron
- The old database function `generate_daily_tasks_direct()` was creating incomplete tasks
- Migration `20251123000001_enable_edge_function_cron.sql` was created to re-enable via HTTP, but requires manual service role key replacement

**Issue**: The migration file has a placeholder `YOUR_SERVICE_ROLE_KEY_HERE` that must be manually replaced before running.

### 2. Supabase Dashboard Edge Function Scheduling - **UNKNOWN**

**Status**: ⚠️ Not verified

**Evidence**:

- Documentation mentions using Supabase Dashboard → Edge Functions → Schedules
- No evidence this was actually configured
- Supabase may or may not support native Edge Function scheduling (varies by plan)

**Issue**: This may not be available on your Supabase plan, or was never set up.

### 3. Alternative: Next.js API Route with External Cron - **NOT IMPLEMENTED**

**Status**: ❌ Not implemented

**Evidence**:

- API route exists at `/api/admin/generate-tasks` for manual triggers
- No external cron service (Vercel Cron, GitHub Actions, etc.) configured to call it

## Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    TASK GENERATION FLOW                      │
└─────────────────────────────────────────────────────────────┘

Manual Trigger (✅ Works):
  User → /api/admin/generate-tasks → Edge Function → Tasks Created

Automated Trigger (❌ Not Working):
  [SCHEDULER] → ??? → Edge Function → Tasks Created
                ↑
         Missing Link!
```

## Diagnostic Steps

### Step 1: Run Diagnostic Script

Run `scripts/diagnose-cron-issue.sql` in Supabase SQL Editor to identify the exact issue:

```sql
-- This will check:
-- 1. Extensions (pg_cron, pg_net)
-- 2. Cron job existence and status
-- 3. Service role key configuration
-- 4. Recent execution history
-- 5. Task generation history
```

### Step 2: Check Supabase Dashboard

1. Go to **Supabase Dashboard** → **Edge Functions** → `generate-daily-tasks`
2. Check for a **"Schedules"** or **"Cron"** tab
3. Verify if any schedule is configured
4. Check **Logs** tab for recent executions

### Step 3: Verify Extensions

```sql
SELECT extname, extversion
FROM pg_extension
WHERE extname IN ('pg_cron', 'pg_net');
```

Both should exist. If not, enable them:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Step 4: Check Cron Job Status

```sql
SELECT jobid, jobname, schedule, active, command
FROM cron.job
WHERE jobname LIKE '%generate%daily%tasks%';
```

**Expected Issues**:

- No rows returned → Cron job doesn't exist
- `active = false` → Cron job is disabled
- Command contains `YOUR_SERVICE_ROLE_KEY` → Key not replaced

## Solutions (Choose One)

### Solution 1: Database Cron via pg_cron (Recommended)

**Pros**:

- ✅ Reliable and persistent
- ✅ Runs within your database
- ✅ Full control over schedule
- ✅ Works on all Supabase plans

**Cons**:

- ⚠️ Requires service role key in database (security consideration)
- ⚠️ Requires pg_cron extension (available on most plans)

**Steps**:

1. **Get your service role key**:
   - Supabase Dashboard → Settings → API → `service_role` key (secret)

2. **Edit `scripts/setup-cron-simple.sql`**:
   - Replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual key
   - Verify the project URL is correct

3. **Run the script in Supabase SQL Editor**:

   ```sql
   -- Copy entire contents of scripts/setup-cron-simple.sql
   -- Paste and run in SQL Editor
   ```

4. **Verify**:

   ```sql
   SELECT * FROM cron.job WHERE jobname = 'generate-daily-tasks-http';
   ```

5. **Test manually** (optional):
   ```sql
   SELECT net.http_post(
     url := 'https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/generate-daily-tasks',
     headers := '{"Authorization": "Bearer YOUR_KEY", "Content-Type": "application/json"}'::jsonb
   );
   ```

### Solution 2: Supabase Dashboard Scheduling (If Available)

**Pros**:

- ✅ No database configuration needed
- ✅ Managed by Supabase
- ✅ Service role key handled automatically

**Cons**:

- ❌ May not be available on your plan
- ❌ Less control over schedule
- ❌ Harder to version control

**Steps**:

1. Go to **Supabase Dashboard** → **Edge Functions** → `generate-daily-tasks`
2. Look for **"Schedules"** or **"Cron"** tab
3. Click **"Add Schedule"** or **"Create Cron"**
4. Configure:
   - **Name**: `daily-task-generation`
   - **Schedule**: `0 3 * * *` (3:00 AM UTC daily)
   - **Authorization**: Service role (should auto-populate)
5. Save and verify

**If this option doesn't exist**: Your Supabase plan may not support it. Use Solution 1 instead.

### Solution 3: External Cron Service (Alternative)

**Pros**:

- ✅ No database configuration
- ✅ Service role key stays in environment variables
- ✅ Works with any Supabase plan
- ✅ Can use free services (GitHub Actions, Vercel Cron)

**Cons**:

- ⚠️ Requires external service setup
- ⚠️ Additional dependency

**Option 3A: Vercel Cron (If Deployed on Vercel)**

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/admin/generate-tasks",
      "schedule": "0 3 * * *"
    }
  ]
}
```

**Option 3B: GitHub Actions**

Create `.github/workflows/daily-tasks.yml`:

```yaml
name: Generate Daily Tasks
on:
  schedule:
    - cron: "0 3 * * *" # 3:00 AM UTC
  workflow_dispatch: # Allow manual trigger

jobs:
  generate-tasks:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Task Generation
        run: |
          curl -X POST "${{ secrets.SUPABASE_URL }}/functions/v1/generate-daily-tasks" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json"
```

**Option 3C: External Cron Service (cron-job.org, EasyCron, etc.)**

1. Sign up for a free cron service
2. Configure HTTP POST to:
   - URL: `https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/generate-daily-tasks`
   - Headers: `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
   - Schedule: Daily at 3:00 AM UTC

## Recommended Solution

**Use Solution 1 (Database Cron)** because:

1. ✅ Most reliable and persistent
2. ✅ Already have the migration file ready
3. ✅ Works on all Supabase plans
4. ✅ Keeps configuration in your database (version controlled via migrations)

## Implementation Checklist

- [ ] Run `scripts/diagnose-cron-issue.sql` to identify current state
- [ ] Choose a solution (recommend Solution 1)
- [ ] Get service role key from Supabase Dashboard
- [ ] Configure the chosen solution
- [ ] Test manually to verify Edge Function works
- [ ] Wait for scheduled time or trigger manually
- [ ] Verify tasks are generated
- [ ] Monitor for 2-3 days to ensure reliability

## Verification

After setup, verify it's working:

1. **Check cron job exists and is active**:

   ```sql
   SELECT jobid, jobname, schedule, active
   FROM cron.job
   WHERE jobname = 'generate-daily-tasks-http';
   ```

2. **Check recent executions**:

   ```sql
   SELECT * FROM cron.job_run_details
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'generate-daily-tasks-http')
   ORDER BY start_time DESC LIMIT 5;
   ```

3. **Check Edge Function logs**:
   - Supabase Dashboard → Edge Functions → `generate-daily-tasks` → Logs

4. **Check tasks generated**:
   ```sql
   SELECT DATE(generated_at), COUNT(*)
   FROM checklist_tasks
   WHERE generated_at > NOW() - INTERVAL '2 days'
   GROUP BY DATE(generated_at);
   ```

## Security Considerations

**Service Role Key in Database**:

- The service role key has full database access
- Stored in `cron.job.command` (encrypted at rest)
- Only accessible to database superusers
- Consider using a dedicated service account if possible

**Alternative**: Use Supabase Dashboard scheduling (Solution 2) if available, as it handles keys more securely.

## Next Steps

1. **Immediate**: Run diagnostic script to identify the issue
2. **Short-term**: Implement Solution 1 (database cron)
3. **Long-term**: Consider migrating to Supabase Dashboard scheduling if it becomes available on your plan

## Related Files

- `scripts/diagnose-cron-issue.sql` - Diagnostic script
- `scripts/setup-cron-simple.sql` - Database cron setup
- `scripts/check-cron-status.sql` - Status verification
- `supabase/migrations/20251123000001_enable_edge_function_cron.sql` - Migration (needs key replacement)
- `supabase/functions/generate-daily-tasks/index.ts` - Edge Function code
- `src/app/api/admin/generate-tasks/route.ts` - Manual trigger API
