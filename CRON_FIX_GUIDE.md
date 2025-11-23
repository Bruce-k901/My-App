# 🔧 Daily Task Cron Fix Guide

**Issue**: Daily task edge function did not run at expected time of 3am BST\
**Date**: 2025-11-23\
**Status**: Investigation Complete - Action Required

---

## 🎯 Quick Summary

The database-level cron was **intentionally disabled** in February 2025 because
it was creating incomplete tasks. The system now relies on **Supabase Edge
Function Scheduling**, which needs to be configured in the Supabase Dashboard.

---

## ✅ Step-by-Step Fix

### Step 1: Check Current Status

Run the SQL diagnostic script to see what's happening:

```sql
-- Copy and paste into Supabase SQL Editor
-- File: scripts/check-cron-status.sql
```

This will show:

- ❌ Database cron jobs (should be empty/disabled)
- ✅ Active site_checklists configurations
- ✅ Task generation history

### Step 2: Test Edge Function Manually

Run the PowerShell test script:

```powershell
cd c:\Users\bruce\my-app
.\scripts\test-edge-function.ps1
```

**You'll need:**

- Service Role Key from Supabase Dashboard → Settings → API

**Expected output:**

```json
{
  "success": true,
  "daily_tasks_created": X,
  "weekly_tasks_created": X,
  "monthly_tasks_created": X,
  ...
}
```

### Step 3: Configure Edge Function Schedule

**In Supabase Dashboard:**

1. Go to: https://supabase.com/dashboard
2. Select project: `xijoybubtrgbrhquqwrx`
3. Navigate to: **Edge Functions**
4. Click on: `generate-daily-tasks`
5. Click: **"Add Schedule"** or **"Cron"** tab

**Schedule Configuration:**

| Setting             | Value                                         |
| ------------------- | --------------------------------------------- |
| **Name**            | `daily-task-generation`                       |
| **Cron Expression** | `0 3 * * *`                                   |
| **Description**     | Generate daily tasks at 3:00 AM UTC           |
| **HTTP Method**     | `POST`                                        |
| **HTTP Headers**    | `Authorization: Bearer YOUR_SERVICE_ROLE_KEY` |
| **Enabled**         | ✅ Yes                                        |

⚠️ **Important**:

- Use the **service_role** key (not anon key)
- Format: `Bearer YOUR_KEY` (with space after Bearer)
- Get key from: Settings → API → service_role (secret)

### Step 4: Verify Schedule

After creating the schedule:

1. Check it appears in the **Schedules** list
2. Status should show **"Enabled"**
3. Next run time should show **"03:00 UTC"**

### Step 5: Monitor Tomorrow

**At 3:00 AM UTC (tomorrow):**

1. Check Edge Function logs:
   - Dashboard → Edge Functions → `generate-daily-tasks` → Logs
   - Look for execution at 03:00:00
   - Verify no errors

2. Check database for new tasks:

   ```sql
   SELECT COUNT(*) as task_count
   FROM checklist_tasks
   WHERE DATE(generated_at) = CURRENT_DATE;
   ```

3. Check application UI:
   - Login to app
   - Navigate to "Today's Tasks"
   - Verify tasks appear

---

## 🕐 Time Zone Reference

| Time Zone         | Current Season | UTC Offset | 3am Local = UTC |
| ----------------- | -------------- | ---------- | --------------- |
| **GMT** (Nov-Mar) | Winter         | UTC+0      | 3:00 AM UTC     |
| **BST** (Mar-Oct) | Summer         | UTC+1      | 2:00 AM UTC     |

**Current**: We're in GMT (November), so:

- 3am GMT = 3am UTC
- Cron expression `0 3 * * *` = 3:00 AM UTC ✅

---

## 🔍 Troubleshooting

### Issue: Edge Function not found

**Solution:**

```powershell
# Deploy the Edge Function
cd c:\Users\bruce\my-app
supabase functions deploy generate-daily-tasks
```

### Issue: Schedule option not available

**Possible causes:**

1. Edge Function not deployed
2. Using Supabase Free tier (may have limitations)
3. Need to use database cron instead

**Alternative**: Use database cron to call Edge Function:

```sql
-- Create HTTP-based cron that calls Edge Function
SELECT cron.schedule(
  'generate-daily-tasks-http',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/generate-daily-tasks',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    )
  );
  $$
);
```

### Issue: Tasks not being created

**Check:**

1. **Active configurations exist:**

   ```sql
   SELECT COUNT(*) FROM site_checklists WHERE active = true;
   ```

2. **Edge Function logs:**
   - Dashboard → Edge Functions → generate-daily-tasks → Logs
   - Look for errors

3. **Service role key is correct:**
   - Test manually with `test-edge-function.ps1`

### Issue: Duplicate tasks

**Check for multiple schedules:**

```sql
SELECT * FROM cron.job WHERE jobname LIKE '%daily%';
```

**In Supabase Dashboard:**

- Edge Functions → generate-daily-tasks → Schedules
- Should only have ONE schedule

---

## 📋 Checklist

- [ ] Run `check-cron-status.sql` to verify current state
- [ ] Run `test-edge-function.ps1` to test manually
- [ ] Configure Edge Function schedule in Supabase Dashboard
- [ ] Verify schedule is enabled
- [ ] Monitor logs tomorrow at 3:00 AM UTC
- [ ] Verify tasks appear in database
- [ ] Verify tasks appear in UI

---

## 📚 Related Files

- **Investigation Report**: `CRON_INVESTIGATION_REPORT.md`
- **Edge Function Code**: `supabase/functions/generate-daily-tasks/index.ts`
- **Deployment Guide**: `EDGE_FUNCTION_DEPLOYMENT_GUIDE.md`
- **Cron Setup**: `docs/CRON_SETUP_INSTRUCTIONS.md`
- **Test Script**: `scripts/test-edge-function.ps1`
- **Status Check**: `scripts/check-cron-status.sql`

---

## 🎯 Expected Outcome

After completing these steps:

✅ Edge Function schedule runs daily at 3:00 AM UTC\
✅ Tasks are automatically created for all active configurations\
✅ No duplicate tasks\
✅ Users see today's tasks in the UI\
✅ Edge Function logs show successful execution

---

## ❓ Need Help?

If you encounter issues:

1. Check Edge Function logs in Supabase Dashboard
2. Run the test script to verify Edge Function works
3. Verify service role key is correct
4. Check that active site_checklists exist in database
