# ✅ Final Deployment Checklist

**Status**: Almost there! Just a few steps left.

---

## 📋 What's Already Done ✅

- ✅ Edge Function code updated (time-based looping, advance loading, 9 task sources)
- ✅ Edge Function updated to look up templates by slug
- ✅ Migration file fixed (no UUID errors, no ON CONFLICT errors)
- ✅ Edge Function deployed once (but needs redeploy after slug lookup changes)

---

## 🚀 What's Left To Do

### Step 1: Run Migration (2 minutes) ⚠️ **REQUIRED**

**Action**: Run the migration in Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/xijoybubtrgbrhquqwrx/sql/new
2. Open file: `supabase/migrations/20250220000006_create_generic_task_templates.sql`
3. Copy the entire contents
4. Paste into SQL Editor
5. Click **Run** (or press F5)

**Expected**: Should run without errors, creates/updates 5 generic templates

**Verify it worked**:

```sql
SELECT slug, name, category, frequency
FROM task_templates
WHERE slug IN (
  'certificate-renewal-generic',
  'sop-review-generic',
  'ra-review-generic',
  'ppm-overdue-generic',
  'callout-followup-generic'
)
ORDER BY name;
```

**Expected**: 5 rows returned

---

### Step 2: Redeploy Edge Function (1 minute) ⚠️ **REQUIRED**

**Why**: We updated the Edge Function to look up templates by slug instead of hardcoded IDs.

**Action**: Run in PowerShell

```powershell
cd C:\Users\bruce\my-app
supabase functions deploy generate-daily-tasks
```

**Expected Output**:

```
✓ Deployed function generate-daily-tasks
Function URL: https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/generate-daily-tasks
```

---

### Step 3: Test the Function (2 minutes) ⚠️ **REQUIRED**

**Get your anon key first**:

1. Go to: https://supabase.com/dashboard/project/xijoybubtrgbrhquqwrx/settings/api
2. Copy the **"anon"** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

**Test in PowerShell**:

```powershell
$anonKey = "PASTE_YOUR_ANON_KEY_HERE"

$headers = @{
    "Authorization" = "Bearer $anonKey"
    "Content-Type" = "application/json"
}

$response = Invoke-RestMethod -Uri "https://xijoybubtrgbrhquqwrx.supabase.co/functions/v1/generate-daily-tasks" -Method Post -Headers $headers

$response | ConvertTo-Json -Depth 10
```

**Expected Response**:

```json
{
  "success": true,
  "timestamp": "2025-02-20T...",
  "daily_tasks_created": 3,
  "weekly_tasks_created": 0,
  "monthly_tasks_created": 0,
  "annual_tasks_created": 0,
  "certificate_tasks_created": 0,
  "sop_review_tasks_created": 0,
  "ra_review_tasks_created": 0,
  "ppm_tasks_created": 0,
  "callout_followup_tasks_created": 0,
  "total_tasks_created": 3,
  "errors": []
}
```

**✅ Success**: If `success: true` and `total_tasks_created > 0`

---

### Step 4: Verify Tasks in Database (1 minute) ✅ **VERIFY**

Run in Supabase SQL Editor:

```sql
SELECT
  tt.name as template_name,
  ct.due_date,
  ct.due_time,
  ct.daypart,
  ct.status,
  ct.priority
FROM checklist_tasks ct
JOIN task_templates tt ON ct.template_id = tt.id
WHERE ct.due_date = CURRENT_DATE
ORDER BY ct.due_time NULLS LAST, ct.priority DESC;
```

**Expected**: Multiple tasks with different times (e.g., 11:00, 14:00, 15:00)

---

### Step 5: Check UI (1 minute) ✅ **VERIFY**

1. Navigate to: `http://localhost:3000/dashboard/checklists`
2. Look for "Today's Tasks" section
3. Verify:
   - Tasks appear grouped by daypart
   - Multiple instances visible (e.g., 3x Fridge Check at different times)
   - Each instance shows correct time

---

### Step 6: Configure Cron Schedule (Optional) ⏰ **AUTOMATION**

**For automatic daily task generation at midnight UTC**:

1. Go to: https://supabase.com/dashboard/project/xijoybubtrgbrhquqwrx/functions
2. Click on `generate-daily-tasks`
3. Click **"Add Schedule"** or **"Cron"**
4. Configure:
   - **Name**: `daily-task-generation`
   - **Cron Expression**: `0 0 * * *` (midnight UTC daily)
   - **Timezone**: `UTC`
   - **Enabled**: `Yes`
5. Add Authorization header:
   - **Header Name**: `Authorization`
   - **Header Value**: `Bearer YOUR_ANON_KEY` (use your anon key)
6. Save

**Note**: This is optional - you can also trigger manually or wait for the cron to run.

---

## 🎯 Quick Summary

**Must Do** (5 minutes):

1. ✅ Run migration in SQL Editor
2. ✅ Redeploy Edge Function
3. ✅ Test function with anon key

**Should Do** (2 minutes): 4. ✅ Verify tasks in database 5. ✅ Check UI shows tasks

**Nice to Have** (3 minutes): 6. ⏰ Configure cron schedule for automation

---

## 🐛 If Something Goes Wrong

### Migration fails

- Check error message
- Make sure you're running the entire file
- Verify `task_templates` table exists

### Function test returns 401

- Double-check anon key (not publishable key)
- Key should start with `eyJ...`
- No extra spaces

### No tasks created

- Check generic templates exist (Step 1 verification query)
- Check active task templates: `SELECT * FROM task_templates WHERE is_active = true;`
- Check active sites: `SELECT * FROM sites WHERE status IS NULL OR status != 'inactive';`
- Check Edge Function logs in Supabase Dashboard

### Tasks not in UI

- Verify frontend is running: `npm run dev`
- Check browser console for errors (F12)
- Verify tasks exist in database (Step 4)

---

## ✅ You're Done When...

- ✅ Migration runs successfully
- ✅ Edge Function redeployed
- ✅ Function test returns `success: true`
- ✅ Tasks appear in database
- ✅ Tasks visible in UI
- ✅ (Optional) Cron schedule configured

**Total Time**: ~10 minutes

---

**Ready? Start with Step 1!** 🚀
