# 🔧 Cron Issues - Resolution Plan

**Date**: 2025-11-23\
**Test Result**: ✅ Edge Function works (67 tasks created)\
**Issues Found**: 2 problems identified

---

## ✅ Test Results Summary

```json
{
  "success": true,
  "timestamp": "2025-11-23T22:09:21.517Z",
  "daily_tasks_created": 3,
  "ppm_tasks_created": 55,      ⚠️ ISSUE: Should not recreate completed PPMs
  "certificate_tasks_created": 2,
  "document_expiry_tasks_created": 1,
  "total_tasks_created": 67
}
```

---

## 🐛 Issue #1: Schedule Not Running Automatically

### **Problem**

Edge Function works when called manually, but doesn't run at 3am automatically.

### **Root Cause**

No schedule configured in Supabase Dashboard. The database cron was
intentionally disabled in February 2025.

### **Solution**

**Option A: Configure Edge Function Schedule (Recommended)**

1. Go to: https://supabase.com/dashboard/project/xijoybubtrgbrhquqwrx/functions
2. Click: `generate-daily-tasks`
3. Click: **"Add Schedule"** or **"Cron"** tab
4. Configure:
   ```
   Name: daily-task-generation
   Cron: 0 3 * * *
   Method: POST
   Headers: Authorization: Bearer YOUR_SERVICE_ROLE_KEY
   ```

**Option B: Create Database Cron to Call Edge Function**

If Edge Function scheduling isn't available, create a migration:

```sql
-- File: supabase/migrations/[timestamp]_enable_edge_function_cron.sql

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule any existing jobs
SELECT cron.unschedule('generate-daily-tasks-http')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'generate-daily-tasks-http');

-- Schedule HTTP call to Edge Function at 3:00 AM UTC
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

⚠️ **Important**: Replace `YOUR_SERVICE_ROLE_KEY` with actual key from Supabase
Dashboard → Settings → API

---

## 🐛 Issue #2: PPM Tasks Recreated After Completion

### **Problem**

55 PPM tasks were created, but they were all completed yesterday. They shouldn't
reappear today.

### **Root Cause**

The Edge Function checks if assets are overdue by looking at:

- `assets.last_service_date` (older than 6 months)
- `assets.next_service_date` (before today)

**BUT**: When a PPM task is completed, it updates `ppm_schedule` table, NOT the
`assets` table.

**Current Logic** (lines 430-436 in Edge Function):

```typescript
const { data: overdueAssets } = await supabase
  .from("assets")
  .select("id, site_id, company_id, name")
  .or(`last_service_date.lt.${sixMonthsAgo.toISOString()},next_service_date.lte.${todayString}`)
  .eq("status", "active");
```

**The Problem**:

1. Asset has `last_service_date` = 6+ months ago (or null)
2. PPM task is completed → Updates `ppm_schedule` table
3. Asset's `last_service_date` is NOT updated
4. Next day, Edge Function sees asset is still "overdue"
5. Creates duplicate PPM task

### **Solution Options**

**Option A: Update Assets Table When PPM Completed (Recommended)**

Modify the PPM completion logic to also update the asset:

```typescript
// In src/lib/ppm.ts - Update the updatePPMSchedule function

export async function updatePPMSchedule(ppm_id: string, asset_id: string, service_date: string) {
  const nextService = new Date(service_date);
  nextService.setMonth(nextService.getMonth() + 6);

  // Update ppm_schedule
  const { error: scheduleError } = await supabase
    .from("ppm_schedule")
    .update({
      last_service_date: service_date,
      next_service_date: nextService.toISOString().split("T")[0],
      status: "upcoming",
    })
    .eq("id", ppm_id);

  if (scheduleError) throw scheduleError;

  // ALSO update the asset table
  const { error: assetError } = await supabase
    .from("assets")
    .update({
      last_service_date: service_date,
      next_service_date: nextService.toISOString().split("T")[0],
    })
    .eq("id", asset_id);

  if (assetError) throw assetError;
}
```

**Option B: Check ppm_schedule Instead of assets**

Modify the Edge Function to check `ppm_schedule` table:

```typescript
// In Edge Function - Replace PPM section

// Get assets that have overdue PPM schedules
const { data: overduePPMs } = await supabase
  .from("ppm_schedule")
  .select("asset_id, assets(id, site_id, company_id, name)")
  .or(`last_service_date.lt.${sixMonthsAgo.toISOString()},next_service_date.lte.${todayString}`)
  .eq("status", "upcoming");

// Filter to unique assets
const overdueAssets = [...new Map(overduePPMs?.map((ppm) => [ppm.assets.id, ppm.assets])).values()];
```

**Option C: Check for Completed Tasks in Last 7 Days**

Add additional check to skip if recently completed:

```typescript
// After line 456, add:

// Check if this PPM was completed in the last 7 days
const sevenDaysAgo = new Date(today);
sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

const { data: recentlyCompleted } = await supabase
  .from("checklist_tasks")
  .select("id")
  .eq("custom_name", taskName)
  .eq("site_id", asset.site_id)
  .eq("status", "completed")
  .gte("completed_at", sevenDaysAgo.toISOString())
  .limit(1);

if (recentlyCompleted && recentlyCompleted.length > 0) continue;
```

---

## 🎯 Recommended Action Plan

### **Immediate (Today)**

1. ✅ **Set up Edge Function schedule** (Issue #1)
   - Use Supabase Dashboard or create database cron migration
   - Test tomorrow at 3:00 AM UTC

2. ✅ **Fix PPM duplicate logic** (Issue #2)
   - Implement **Option A** (update assets table when PPM completed)
   - This is the cleanest solution and keeps data in sync

### **Verification (Tomorrow)**

1. Check Edge Function logs at 3:00 AM UTC
2. Verify tasks are created automatically
3. Verify PPM tasks are NOT duplicated

---

## 📋 Implementation Checklist

- [ ] Choose schedule option (Dashboard or Database Cron)
- [ ] Set up schedule with correct service role key
- [ ] Update `src/lib/ppm.ts` to update assets table
- [ ] Find where PPM tasks are completed and ensure it calls updated function
- [ ] Test PPM completion flow
- [ ] Monitor tomorrow at 3:00 AM UTC
- [ ] Verify no duplicate PPM tasks

---

## 📚 Files to Modify

### For Issue #1 (Schedule):

- Option A: Supabase Dashboard (no code changes)
- Option B: `supabase/migrations/[new]_enable_edge_function_cron.sql`

### For Issue #2 (PPM Duplicates):

- `src/lib/ppm.ts` - Add asset_id parameter and update assets table
- Find PPM completion handler and update function call

---

## ⚠️ Important Notes

- **Service Role Key**: Keep it secret, never commit to git
- **Time Zone**: 3am GMT = 3am UTC (currently in winter time)
- **Testing**: Run manual test again tomorrow to verify PPM fix
- **Monitoring**: Check logs daily for first week to ensure stability
