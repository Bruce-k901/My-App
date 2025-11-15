# Fix: Temperature Tasks Not Being Created by Cron

## Problem

Cron ran but only created 2 tasks (likely compliance scanning tasks), not the expected 5 temperature monitoring tasks:

- Expected: 3 cold temp monitoring tasks (3 dayparts)
- Expected: 2 hot temp monitoring tasks (2 dayparts)

## Diagnostic Steps

1. **Run the diagnostic query:**

   ```sql
   -- Run: DEBUG_CRON_TEMPERATURE_TASKS.sql
   ```

2. **Check the results:**
   - Are temperature templates active? (`is_active = true`)
   - Do templates match sites? (Check query #4)
   - Are there existing tasks preventing duplicates? (Check query #6)
   - How many matching sites are found? (Check query #7)

## Common Issues & Fixes

### Issue 1: Templates Not Active

**Symptom:** Query #1 shows `is_active = false`

**Fix:**

```sql
UPDATE task_templates
SET is_active = true
WHERE (slug LIKE '%temperature%' OR slug LIKE '%temp%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%')
  AND frequency = 'daily'
  AND is_active = false;
```

### Issue 2: Company ID Mismatch

**Symptom:** Query #4 shows "Company mismatch" or "NO MATCH"

**Fix:** Ensure templates are either:

- Global (`company_id = NULL`) - works for all companies
- Company-specific (`company_id = your_company_id`) - matches site's company_id

```sql
-- Make templates global (if they should be available to all companies)
UPDATE task_templates
SET company_id = NULL
WHERE (slug LIKE '%temperature%' OR slug LIKE '%temp%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%')
  AND frequency = 'daily'
  AND company_id IS NOT NULL;
```

### Issue 3: Sites Are Inactive

**Symptom:** Query #2 shows sites with `status = 'inactive'`

**Fix:**

```sql
-- Check site status
SELECT id, name, status FROM sites WHERE status = 'inactive';

-- If needed, activate sites (or set status to NULL)
UPDATE sites SET status = NULL WHERE status = 'inactive';
```

### Issue 4: Tasks Already Exist (Duplicate Prevention)

**Symptom:** Query #6 shows tasks already exist for today

**Fix:** The cron prevents duplicates. If you want to regenerate:

```sql
-- Delete existing cron-generated tasks for today
DELETE FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND task_data->>'source' = 'cron'
  AND template_id IN (
    SELECT id FROM task_templates
    WHERE slug LIKE '%temperature%' OR slug LIKE '%temp%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%'
  );

-- Then re-run the cron
SELECT * FROM generate_daily_tasks_direct();
```

### Issue 5: Dayparts Not Set

**Symptom:** Query #8 shows dayparts are NULL or empty

**Fix:**

```sql
-- Check current dayparts
SELECT id, name, dayparts FROM task_templates
WHERE (slug LIKE '%temperature%' OR slug LIKE '%temp%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%')
  AND frequency = 'daily';

-- Set dayparts for cold temp (if missing)
UPDATE task_templates
SET dayparts = ARRAY['before_open', 'during_service', 'after_service']
WHERE slug = 'fridge-freezer-temperature-check'
  AND (dayparts IS NULL OR array_length(dayparts, 1) IS NULL);

-- Set dayparts for hot temp (if missing)
UPDATE task_templates
SET dayparts = ARRAY['during_service']
WHERE slug = 'hot_holding_temperature_verification'
  AND (dayparts IS NULL OR array_length(dayparts, 1) IS NULL);
```

## Quick Fix Script

Run this to fix common issues:

```sql
-- 1. Ensure templates are active
UPDATE task_templates
SET is_active = true
WHERE (slug LIKE '%temperature%' OR slug LIKE '%temp%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%')
  AND frequency = 'daily';

-- 2. Ensure templates are global (or match your company_id)
-- Option A: Make them global
UPDATE task_templates
SET company_id = NULL
WHERE (slug LIKE '%temperature%' OR slug LIKE '%temp%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%')
  AND frequency = 'daily'
  AND company_id IS NOT NULL;

-- Option B: Or set to your company_id (replace YOUR_COMPANY_ID)
-- UPDATE task_templates
-- SET company_id = 'YOUR_COMPANY_ID'
-- WHERE (slug LIKE '%temperature%' OR slug LIKE '%temp%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%')
--   AND frequency = 'daily';

-- 3. Ensure sites are active
UPDATE sites SET status = NULL WHERE status = 'inactive';

-- 4. Delete existing cron tasks for today (if you want to regenerate)
DELETE FROM checklist_tasks
WHERE due_date = CURRENT_DATE
  AND task_data->>'source' = 'cron';

-- 5. Re-run the cron
SELECT * FROM generate_daily_tasks_direct();

-- 6. Check results
SELECT
  t.name as template_name,
  COUNT(*) as tasks_created,
  array_agg(DISTINCT ct.daypart) as dayparts
FROM checklist_tasks ct
JOIN task_templates t ON ct.template_id = t.id
WHERE ct.due_date = CURRENT_DATE
  AND ct.task_data->>'source' = 'cron'
  AND (t.slug LIKE '%temperature%' OR t.slug LIKE '%temp%' OR t.name ILIKE '%temperature%' OR t.name ILIKE '%temp%')
GROUP BY t.name
ORDER BY t.name;
```
