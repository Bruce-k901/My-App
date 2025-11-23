# 🚀 Quick Action Guide - Daily Task Cron Fix

## ✅ What Was Fixed

1. **PPM Duplicate Issue** - ✅ Code already fixed in `src/lib/ppm.ts`
2. **Missing Schedule** - ⏳ Needs your action (choose option below)

---

## 🎯 What You Need To Do NOW

### **Option 1: Supabase Dashboard (5 minutes)** ⭐ RECOMMENDED

1. Open: https://supabase.com/dashboard/project/xijoybubtrgbrhquqwrx/functions
2. Click: `generate-daily-tasks`
3. Click: **"Add Schedule"** or **"Cron"** tab
4. Fill in:
   ```
   Name: daily-task-generation
   Cron Expression: 0 3 * * *
   HTTP Method: POST
   ```
5. Add Header:
   ```
   Key: Authorization
   Value: Bearer YOUR_SERVICE_ROLE_KEY
   ```
   (Get key from: Settings → API → service_role)
6. Click: **Save** or **Create**
7. ✅ Done!

---

### **Option 2: Database Cron via SQL Editor (5 minutes)**

**Easier than migration!** Just paste SQL directly:

1. **Get your service role key**:
   - Supabase Dashboard → Settings → API
   - Copy the **service_role** key (secret)

2. **Open the SQL file**:
   - Open: `scripts/setup-cron-simple.sql`
   - Find: `YOUR_SERVICE_ROLE_KEY_HERE` (appears twice)
   - Replace with your actual key

3. **Run in Supabase**:
   - Go to: Supabase Dashboard → SQL Editor
   - Copy ALL contents from `setup-cron-simple.sql`
   - Paste into SQL Editor
   - Click **"Run"**

4. **Verify**:
   - Should see: `✅ Looks good!` in the results
   - If you see `⚠️ WARNING`, you forgot to replace the key

5. ✅ Done!

---

## 📊 Verification

### **Tomorrow at 3:00 AM UTC**:

Check if it worked:

1. **Supabase Dashboard** → Edge Functions → `generate-daily-tasks` → Logs
   - Should see execution at ~03:00:00

2. **Run this SQL**:

   ```sql
   SELECT COUNT(*) as tasks_created_today
   FROM checklist_tasks
   WHERE DATE(generated_at) = CURRENT_DATE;
   ```

   - Should show ~6 tasks (NOT 67!)

3. **Check for duplicates**:
   ```sql
   SELECT custom_name, COUNT(*)
   FROM checklist_tasks
   WHERE DATE(generated_at) = CURRENT_DATE
   GROUP BY custom_name
   HAVING COUNT(*) > 1;
   ```

   - Should return 0 rows

---

## 🆘 If Something Goes Wrong

**Run manual test**:

```powershell
cd c:\Users\bruce\my-app
.\scripts\test-edge-function.ps1
```

**Check status**:

- Paste `scripts/check-cron-status.sql` into Supabase SQL Editor

**Get help**:

- Check `CRON_ISSUES_FIXED.md` for full details
- Check Edge Function logs in Supabase Dashboard

---

## 📝 Summary

- ✅ PPM fix: Already applied (will deploy with next push)
- ⏳ Schedule: **Choose Option 1 or 2 above** (do this now!)
- 🕐 Time: 3:00 AM UTC = 3:00 AM GMT (current time zone)
- 📅 Next run: Tomorrow at 3:00 AM

---

**That's it! Choose one option above and you're done.** 🎉
