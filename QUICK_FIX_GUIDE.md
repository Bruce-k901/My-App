# 🚀 Quick Fix Guide - Daily Tasks Cron Not Running

## The Problem

Your `generate-daily-tasks` Edge Function works when called manually, but doesn't run automatically at 3:00 AM UTC.

## Root Cause

**The cron job is not configured or is inactive.** There are three possible scheduling methods, and none appear to be set up correctly.

## Quick Diagnosis (2 minutes)

Run this in Supabase SQL Editor:

```sql
-- Quick check
SELECT
  CASE
    WHEN NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN '❌ pg_cron not enabled'
    WHEN NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname LIKE '%generate%daily%tasks%') THEN '❌ No cron job exists'
    WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname LIKE '%generate%daily%tasks%' AND active = false) THEN '❌ Cron job is INACTIVE'
    WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname LIKE '%generate%daily%tasks%' AND command LIKE '%YOUR_SERVICE_ROLE_KEY%') THEN '❌ Service role key not replaced'
    ELSE '✅ Cron job exists and appears configured'
  END as status;
```

Or run the full diagnostic: `scripts/diagnose-cron-issue.sql`

## Solution: Database Cron (Recommended - 5 minutes)

### Step 1: Get Your Service Role Key

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Find the **`service_role`** key (it's a secret, starts with `eyJ...`)
3. Copy it (you'll need it in Step 2)

### Step 2: Set Up Cron Job

1. Open `scripts/setup-cron-improved.sql` in your editor
2. Find `YOUR_SERVICE_ROLE_KEY_HERE` (line ~45)
3. Replace it with your actual service role key
4. Copy the entire file
5. Paste into **Supabase SQL Editor**
6. Click **Run**

### Step 3: Verify

Run this to confirm:

```sql
SELECT
  jobname,
  schedule,
  active,
  CASE
    WHEN active = true THEN '✅ Active - Will run at 3:00 AM UTC'
    ELSE '❌ Inactive - Fix needed'
  END as status
FROM cron.job
WHERE jobname = 'generate-daily-tasks-http';
```

Expected result: `active = true` and `schedule = '0 3 * * *'`

## Alternative Solutions

### Option 2: Supabase Dashboard Scheduling

**If available on your plan:**

1. Go to **Supabase Dashboard** → **Edge Functions** → `generate-daily-tasks`
2. Look for **"Schedules"** or **"Cron"** tab
3. Click **"Add Schedule"**
4. Set:
   - Name: `daily-task-generation`
   - Cron: `0 3 * * *`
   - Authorization: Service role
5. Save

**If this tab doesn't exist**: Your plan doesn't support it. Use Option 1.

### Option 3: External Cron Service

Use a free service like [cron-job.org](https://cron-job.org):

1. Sign up (free)
2. Create new cron job
3. Set:
   - URL: `https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/generate-daily-tasks`
   - Method: POST
   - Headers: `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
   - Schedule: Daily at 3:00 AM UTC

## Testing

After setup, test immediately:

```sql
-- Test the HTTP call (replace YOUR_KEY)
SELECT net.http_post(
  url := 'https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/generate-daily-tasks',
  headers := json_build_object(
    'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
    'Content-Type', 'application/json'
  )::jsonb
);
```

Or use the API route:

```bash
curl -X POST https://your-app.com/api/admin/generate-tasks \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Verification Checklist

- [ ] Cron job exists: `SELECT * FROM cron.job WHERE jobname = 'generate-daily-tasks-http';`
- [ ] Cron job is active: `active = true`
- [ ] Service role key is set (not placeholder)
- [ ] Extensions enabled: `pg_cron` and `pg_net`
- [ ] Manual test works (Edge Function executes)
- [ ] Check Edge Function logs in Dashboard
- [ ] Wait for 3:00 AM UTC or trigger manually
- [ ] Verify tasks are generated: `SELECT COUNT(*) FROM checklist_tasks WHERE DATE(generated_at) = CURRENT_DATE;`

## Common Issues

### "Extension pg_cron does not exist"

**Fix**: Your Supabase plan may not support pg_cron. Use Option 2 or 3 instead.

### "Service role key not replaced"

**Fix**: Edit the script and replace `YOUR_SERVICE_ROLE_KEY_HERE` with your actual key.

### "Cron job exists but active = false"

**Fix**: The job was disabled. Recreate it using the setup script.

### "No recent executions in cron.job_run_details"

**Fix**:

- Check if job is active
- Verify schedule is correct
- Check Edge Function logs for errors
- Test manually to ensure Edge Function works

## Next Steps

1. **Immediate**: Run diagnostic script to identify the issue
2. **Today**: Set up cron job using Option 1
3. **Tomorrow**: Verify it ran at 3:00 AM UTC
4. **This Week**: Monitor for 2-3 days to ensure reliability

## Files Reference

- `scripts/diagnose-cron-issue.sql` - Full diagnostic
- `scripts/setup-cron-improved.sql` - Improved setup script
- `scripts/setup-cron-simple.sql` - Simple setup script
- `CRON_ISSUE_DEEP_DIVE.md` - Detailed investigation
- `scripts/check-cron-status.sql` - Status verification

## Need Help?

1. Run `scripts/diagnose-cron-issue.sql` and share the results
2. Check Edge Function logs in Supabase Dashboard
3. Verify Edge Function works manually via API route
4. Check Supabase plan limitations (some plans don't support pg_cron)
