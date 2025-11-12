# 🚨 CRITICAL: Tasks Not Being Generated for Today

## The Problem

**Zero tasks exist for today's date** - the Edge Function is either:

1. Not running at all
2. Running but failing silently
3. Creating tasks with wrong dates
4. Failing due to missing templates/sites

## Immediate Diagnostic Steps

### Step 1: Run Diagnostic Query

Run `scripts/diagnose-missing-tasks.sql` to check:

- Do ANY tasks exist?
- What dates have tasks?
- Are there active templates?
- Are there active sites?

### Step 2: Check Edge Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions** → **generate-daily-tasks**
2. Click **"Logs"** tab
3. Check for:
   - Recent executions
   - Error messages
   - Execution times

### Step 3: Manually Trigger Task Generation

**Option A: Via SQL (Database Function)**

```sql
SELECT * FROM generate_daily_tasks_direct();
```

**Option B: Via Edge Function (HTTP)**

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/generate-daily-tasks \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

**Option C: Via Next.js API**

```bash
curl -X POST http://localhost:3000/api/admin/generate-tasks \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

### Step 4: Check What Happens

After manually triggering, immediately run:

```sql
SELECT
  id,
  template_id,
  site_id,
  due_date,
  due_time,
  status,
  generated_at
FROM checklist_tasks
WHERE generated_at >= NOW() - INTERVAL '5 minutes'
ORDER BY generated_at DESC;
```

## Common Issues & Fixes

### Issue 1: Edge Function Not Scheduled

**Symptom**: No logs in Edge Function dashboard

**Fix**:

1. Go to Supabase Dashboard → Edge Functions → generate-daily-tasks
2. Click "Schedule"
3. Set cron: `0 3 * * *` (3am UTC)
4. Method: GET or POST
5. Save

### Issue 2: No Active Templates

**Symptom**: Diagnostic shows 0 active templates

**Fix**:

```sql
-- Check templates
SELECT id, name, frequency, is_active
FROM task_templates
WHERE is_active = true;

-- If none, activate some:
UPDATE task_templates
SET is_active = true
WHERE id = 'YOUR_TEMPLATE_ID';
```

### Issue 3: No Active Sites

**Symptom**: Diagnostic shows 0 active sites

**Fix**:

```sql
-- Check sites
SELECT id, name, company_id, status
FROM sites
WHERE status IS NULL OR status != 'inactive';

-- If none, check why sites are inactive
```

### Issue 4: Template/Site Mismatch

**Symptom**: Templates exist but no tasks created

**Fix**: Templates might be filtered out due to:

- `company_id` mismatch
- `site_id` mismatch
- Template is company-specific but no matching sites

Check:

```sql
-- See which templates would generate tasks
SELECT
  t.id as template_id,
  t.name,
  t.frequency,
  t.company_id as template_company,
  COUNT(s.id) as matching_sites
FROM task_templates t
LEFT JOIN sites s ON (
  (t.company_id IS NULL OR t.company_id = s.company_id)
  AND (t.site_id IS NULL OR t.site_id = s.id)
  AND (s.status IS NULL OR s.status != 'inactive')
)
WHERE t.is_active = true
GROUP BY t.id, t.name, t.frequency, t.company_id;
```

### Issue 5: Edge Function Errors

**Symptom**: Logs show errors

**Common errors**:

- `Unauthorized` → Missing/invalid auth token
- `Table not found` → Migration not run
- `Permission denied` → RLS policies blocking access

**Fix**: Check Edge Function logs for specific error messages

## Verification After Fix

1. **Manually trigger** task generation
2. **Check tasks created**:
   ```sql
   SELECT COUNT(*)
   FROM checklist_tasks
   WHERE due_date = CURRENT_DATE;
   ```
3. **Check Today's Tasks page** - should show tasks
4. **Check Active Tasks page** - should also show tasks

## Next Steps

1. ✅ Run diagnostic query
2. ✅ Check Edge Function logs
3. ✅ Manually trigger generation
4. ✅ Verify tasks are created
5. ✅ Set up/verify schedule if needed
