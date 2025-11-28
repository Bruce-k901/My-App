# ✅ Today's Tasks Module - Rebuild Complete

**Date**: February 20, 2025  
**Status**: ✅ IMPLEMENTED - Ready for Deployment

---

## 📋 What Was Done

### 1. ✅ Created Generic Templates Migration

**File**: `supabase/migrations/20250220000006_create_generic_task_templates.sql`

Creates 5 generic templates for auto-generated tasks:

- `certificate-renewal` - Certificate expiry reminders
- `sop-review` - SOP review tasks
- `ra-review` - Risk Assessment review tasks
- `ppm-overdue` - PPM overdue maintenance tasks
- `callout-followup` - Contractor callout follow-ups

**Action Required**: Run this migration in Supabase SQL Editor before deploying the Edge Function.

### 2. ✅ Replaced Edge Function

**File**: `supabase/functions/generate-daily-tasks/index.ts`

**Key Improvements**:

- ✅ **Time-based looping** (not daypart-based) - Creates correct number of task instances
- ✅ **Advance loading** - Monthly tasks load 7 days before, annual tasks load 30 days before
- ✅ **9 task sources** - Daily, weekly, monthly, annual, certificates, SOPs, RAs, PPM, callouts
- ✅ **Better duplicate prevention** - Checks `due_time` in addition to other fields
- ✅ **Error handling** - Gracefully handles missing tables/fields

**Fixes Applied**:

- Fixed `taskExists()` function to handle missing tasks correctly (no `.single()` error)
- Updated SOP queries to use `sop_entries` table (actual table name)
- Updated sites queries to handle status field correctly
- Made SOP tasks company-wide (not site-specific) since SOPs are company-level

### 3. ✅ Code Quality

- No linting errors
- TypeScript types properly defined
- Error handling for all edge cases
- Comprehensive logging

---

## 🚀 Deployment Steps

### Step 1: Run Migration (2 minutes)

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20250220000006_create_generic_task_templates.sql`
3. Execute
4. Verify 5 templates created:

```sql
SELECT id, name FROM task_templates
WHERE id IN ('certificate-renewal', 'sop-review', 'ra-review', 'ppm-overdue', 'callout-followup');
```

### Step 2: Deploy Edge Function (3 minutes)

```bash
supabase functions deploy generate-daily-tasks
```

### Step 3: Test Manually (2 minutes)

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/generate-daily-tasks \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

**Expected Response**:

```json
{
  "success": true,
  "daily_tasks_created": 12,
  "weekly_tasks_created": 0,
  "monthly_tasks_created": 0,
  "annual_tasks_created": 0,
  "certificate_tasks_created": 2,
  "sop_review_tasks_created": 1,
  "ra_review_tasks_created": 0,
  "ppm_tasks_created": 0,
  "callout_followup_tasks_created": 0,
  "total_tasks_created": 15,
  "errors": []
}
```

### Step 4: Verify in Database (2 minutes)

```sql
-- Check today's tasks with multiple times
SELECT
  tt.name,
  ct.due_time,
  ct.daypart,
  COUNT(*) as instances
FROM checklist_tasks ct
JOIN task_templates tt ON ct.template_id = tt.id
WHERE ct.due_date = CURRENT_DATE
GROUP BY tt.name, ct.due_time, ct.daypart
ORDER BY ct.due_time;
```

**Expected**: Multiple rows for templates with multiple times (e.g., 3 fridge checks at different times)

### Step 5: Verify in UI (2 minutes)

1. Navigate to `/dashboard/checklists`
2. Check "Today's Tasks" section
3. Verify:
   - Multiple instances of same template (if multiple times configured)
   - Tasks grouped by daypart
   - Each instance independently completable

---

## 🔍 Key Changes Explained

### Change 1: Time-Based Loop (Lines ~178-211)

**Before**: Looped through `dayparts` array → Created one task per daypart  
**After**: Loops through `recurrence_pattern.daypart_times` → Creates one task per TIME

**Impact**: If a template has 3 times (11:00, 14:00, 15:00), it now creates 3 tasks instead of 1.

### Change 2: Advance Loading (Lines ~333-339, ~415-421)

**Monthly Tasks**: Load 7 days before due date  
**Annual Tasks**: Load 30 days before due date

**Impact**: Users have time to complete tasks before they're due.

### Change 3: Additional Task Sources (Lines ~460-746)

Now generates tasks from:

- Certificate expiry dates (30 days before)
- SOP review dates (30 days before)
- Risk Assessment review dates (30 days before)
- PPM overdue assets (immediate)
- Open contractor callouts (daily follow-ups)

**Impact**: Complete task generation from all app data sources.

---

## ⚠️ Important Notes

### Table Names

- **SOPs**: Uses `sop_entries` table (not `sops`)
- **Callouts**: Tries `callouts` first, falls back to `contractor_callouts`
- **Sites**: Uses `status` field (null or not "inactive" = active)

### Missing Fields

If these fields don't exist, the Edge Function will log errors but continue:

- `sop_entries.review_date` - SOP review date field
- `risk_assessments.review_date` - RA review date field
- `profiles.*_expiry_date` - Certificate expiry fields

### Generic Template IDs

The Edge Function uses these hardcoded template IDs:

- `certificate-renewal`
- `sop-review`
- `ra-review`
- `ppm-overdue`
- `callout-followup`

**These must exist** in `task_templates` table (created by migration).

---

## 📊 Expected Results

### Before Fix

- 4 tasks total
- 1 task per template (regardless of multiple times)
- No advance loading
- Only template-based tasks

### After Fix

- 10-20+ tasks total (depending on active templates)
- Multiple tasks per template (one per time)
- Monthly/annual tasks load early
- Tasks from certificates, SOPs, RAs, PPM, callouts

---

## 🧪 Testing

See `docs/TESTING_GUIDE.md` for comprehensive testing procedures (11 tests covering all scenarios).

**Quick Test**:

1. Create a template with multiple times in `recurrence_pattern.daypart_times`
2. Run Edge Function manually
3. Verify multiple tasks created in database
4. Check UI shows all instances

---

## 🐛 Troubleshooting

### No tasks created

- ✅ Check generic templates exist
- ✅ Check sites are active (`status IS NULL OR status != 'inactive'`)
- ✅ Check templates are active (`is_active = true`)
- ✅ Check Edge Function logs for errors

### Wrong number of instances

- ✅ Verify `recurrence_pattern.daypart_times` structure
- ✅ Check times are strings: `"11:00"` not `11`
- ✅ Verify dayparts match expected values

### Tasks not in UI

- ✅ Verify frontend queries `checklist_tasks` table
- ✅ Check daypart values match UI expectations
- ✅ Verify site_id/company_id filters

---

## ✅ Success Criteria

You'll know it worked when:

1. ✅ Daily tasks create multiple instances (3 for fridge check with 3 times)
2. ✅ Weekly tasks only appear on scheduled days
3. ✅ Monthly tasks appear 7 days before due date
4. ✅ Annual tasks appear 30 days before due date
5. ✅ Certificate/SOP/RA tasks generate 30 days before
6. ✅ PPM tasks generate for overdue assets
7. ✅ Callout follow-ups generate daily
8. ✅ No duplicates when running twice
9. ✅ UI shows all tasks correctly

---

## 📝 Next Steps

1. **Deploy migration** - Run SQL migration in Supabase
2. **Deploy Edge Function** - `supabase functions deploy generate-daily-tasks`
3. **Test manually** - Run Edge Function and verify response
4. **Verify database** - Check tasks created correctly
5. **Verify UI** - Check Today's Tasks page
6. **Monitor first cron run** - Check logs at midnight UTC
7. **Run full test suite** - Follow `docs/TESTING_GUIDE.md`

---

**Status**: ✅ Ready for deployment  
**Estimated Time**: 15 minutes  
**Risk Level**: Low (backward compatible, graceful error handling)
