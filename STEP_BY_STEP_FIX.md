# STEP-BY-STEP FIX FOR PAYROLL ISSUES

## The Problems:
1. Period showing as 1 week instead of 4 weeks
2. Only 1 employee showing
3. All pay is £0.00
4. Only 1 site showing

## STEP 1: Delete ALL existing payroll data
Run this in Supabase SQL Editor:
```sql
DELETE FROM payroll_entries;
DELETE FROM payroll_runs;
```

## STEP 2: Check your payrun schedule settings
Run this to see what schedule is configured:
```sql
SELECT 
  id,
  company_id,
  schedule_type,
  period_start_day,
  days_after_period_end,
  is_active
FROM payrun_schedules
WHERE is_active = true;
```

**CRITICAL**: The `schedule_type` MUST be `'four_weekly'` for 4-week periods!

## STEP 3: Check employee pay rates
Run this to see if employees have hourly rates set:
```sql
SELECT 
  id,
  full_name,
  pay_type,
  hourly_rate,
  annual_salary
FROM profiles
WHERE company_id IN (
  SELECT company_id FROM payrun_schedules WHERE is_active = true LIMIT 1
)
ORDER BY full_name;
```

**CRITICAL**: If `hourly_rate` is NULL or 0, gross pay will be £0.00!

## STEP 4: Redeploy the function
1. Open `supabase/sql/create_payroll_run_from_signoff_v2.sql`
2. Copy the ENTIRE file
3. Run it in Supabase SQL Editor
4. Check for any errors

## STEP 5: Check Supabase Logs
After redeploying, go to Supabase Dashboard > Logs
Look for `RAISE NOTICE` messages that show:
- What schedule was found
- What period was calculated
- What employees were processed

## STEP 6: Lock a week again
1. Go to attendance signoff page
2. Lock a week
3. Check the browser console for errors
4. Check Supabase logs for `RAISE NOTICE` messages

## STEP 7: Verify the payroll run
Run this to see what was created:
```sql
SELECT 
  id,
  pay_period_type,
  period_start_date,
  period_end_date,
  (period_end_date - period_start_date + 1) as days,
  site_ids,
  total_employees,
  total_gross_pay
FROM payroll_runs
ORDER BY created_at DESC
LIMIT 1;
```

**Expected results:**
- `pay_period_type` should be `'four_weekly'`
- `days` should be `28`
- `site_ids` should be `NULL` (meaning all sites)
- `total_employees` should be > 1
- `total_gross_pay` should be > 0

## If it's STILL wrong:

### Check if the function is actually being called:
Look in Supabase logs for: `create_payroll_run_from_signoff called`

### Check what period was calculated:
Look for: `Calculated period: start=..., end=..., type=..., days=...`

### Check if schedule was found:
Look for: `Found schedule: type=..., period_start_day=...`

### If schedule type is wrong:
Go to Settings > Payroll Settings and make sure it's set to "Four-Weekly"

### If employees have no hourly_rate:
Update the profiles table:
```sql
UPDATE profiles 
SET hourly_rate = 11.50  -- Set your default rate
WHERE hourly_rate IS NULL 
  AND pay_type = 'hourly';
```

