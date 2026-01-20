# Fix Payroll Period Issue

## The Problem
The payroll page is showing 1 week instead of the full pay period (4-weekly) because:
1. The existing payroll run was created with old dates (1 week)
2. The function returns existing runs instead of recalculating

## Solution Steps

### Step 1: Verify Your Schedule
Run this in Supabase SQL Editor:
```sql
SELECT * FROM payrun_schedules 
WHERE is_active = true 
ORDER BY created_at DESC;
```

Make sure you see:
- `schedule_type = 'four_weekly'`
- `is_active = true`

### Step 2: Delete Old Payroll Runs
Run this to delete existing payroll runs (they'll be recreated with correct periods):
```sql
-- Delete payroll entries first (they reference payroll_runs)
DELETE FROM payroll_entries 
WHERE payroll_run_id IN (
  SELECT id FROM payroll_runs 
  WHERE company_id = (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid())
);

-- Delete payroll runs
DELETE FROM payroll_runs 
WHERE company_id = (SELECT company_id FROM profiles WHERE auth_user_id = auth.uid());
```

### Step 3: Deploy Updated Function
Run the entire `create_payroll_run_from_signoff_v2.sql` file in Supabase SQL Editor.

### Step 4: Create New Payroll Run
1. Go to Attendance Signoff page
2. Unlock the week (if locked)
3. Lock it again - this will create a NEW payroll run with the correct 4-week period

### Step 5: Verify
Check the payroll page - it should now show:
- Period dates spanning 28 days
- Badge showing "4-Weekly (28 days)"
- All 4 week columns

## Check Supabase Logs
After locking a week, check Supabase Logs to see:
- "Found schedule: type=four_weekly..."
- "Calculated period: start=..., end=..., type=four_weekly, days=28"

