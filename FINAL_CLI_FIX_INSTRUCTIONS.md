# Final CLI Fix Instructions

## Current Status

✅ CLI is working and connected  
✅ Migration history repair script created  
⚠️ **Issue**: 18 duplicate migration timestamps (2 files share same timestamp)

## The Problem

You have migration files with duplicate timestamps like:

- `20250115000000_fix_compliance_score_function.sql`
- `20250115000000_seed_food_labelling_dating_audit_template.sql`

Supabase can only store **one migration per timestamp** in the history table.

## Solution: Two-Step Fix

### Step 1: Remove Duplicates from History

Run this SQL in **Supabase Dashboard → SQL Editor**:

```sql
-- Remove ALL duplicate-timestamp migrations from history
DELETE FROM supabase_migrations.schema_migrations
WHERE version IN (
    '20250115000000',
    '20250206000001',
    '20250206000002',
    '20250206000003',
    '20250206000004',
    '20250207000001',
    '20250207000002',
    '20250220000000',
    '20250220000001',
    '20250220000002',
    '20250220000003',
    '20250220000004',
    '20250220000005',
    '20250220000006',
    '20250221000001',
    '20250221000002',
    '20250221000003',
    '20250221000004'
);
```

**File location:** `supabase/sql/fix_duplicate_migrations.sql`

### Step 2: Rename Duplicate Migration Files

For each duplicate pair, rename the **second file** to have a unique timestamp:

**Manual Rename (Quick):**

1. Go to `supabase/migrations/` folder
2. For each duplicate, rename the second file by adding `00001` to the timestamp:

```
20250115000000_seed_food_labelling_dating_audit_template.sql
→ 20250115000001_seed_food_labelling_dating_audit_template.sql

20250206000001_update_pricing_calculation.sql
→ 20250206000002_update_pricing_calculation.sql

20250206000002_fix_task_generation_concatenation_error.sql
→ 20250206000003_fix_task_generation_concatenation_error.sql

... and so on for all 18 duplicates
```

**Or use this PowerShell one-liner (run in migrations folder):**

```powershell
cd supabase\migrations
Get-ChildItem -Filter "*.sql" | Where-Object { $_.Name -match '^\d{14}_' } | Group-Object { ($_.Name -split '_')[0] } | Where-Object { $_.Count -gt 1 } | ForEach-Object { $files = $_.Group | Sort-Object Name; for ($i=1; $i -lt $files.Count; $i++) { $old = $files[$i].Name; $ts = ($old -split '_')[0]; $newTs = ([long]$ts + $i).ToString().PadLeft(14, '0'); $new = $old -replace "^$ts", $newTs; Rename-Item $old $new; Write-Host "Renamed: $old -> $new" } }
```

### Step 3: Push Migrations

After renaming, run:

```bash
supabase db push --include-all
```

## Alternative: Quick Workaround

If you want to proceed without renaming files right now:

1. **Run the SQL fix** (Step 1 above)
2. **Manually apply the second file** of each duplicate pair via SQL Editor
3. **Then mark them as applied** using migration repair

But renaming is the cleaner long-term solution.

## Files to Rename

Here are all 18 duplicate files that need renaming (the second file in each pair):

1. `20250115000000_seed_food_labelling_dating_audit_template.sql`
2. `20250206000001_update_pricing_calculation.sql`
3. `20250206000002_fix_task_generation_concatenation_error.sql`
4. `20250206000003_add_unique_constraint_prevent_duplicates.sql`
5. `20250206000004_test_cron_11am_bst.sql`
6. `20250207000001_update_cron_schedule_for_daily_tasks.sql`
7. `20250207000002_fix_single_daily_cron_comprehensive.sql`
8. `20250220000000_create_staff_attendance.sql`
9. `20250220000001_update_channel_last_message_trigger.sql`
10. `20250220000002_update_notification_functions_for_staff_attendance.sql`
11. `20250220000003_setup_topics_and_pinning.sql`
12. `20250220000004_fix_remaining_attendance_references.sql`
13. `20250220000005_fix_tasks_insert_policy.sql`
14. `20250220000006_fix_notification_system_functions.sql`
15. `20250221000001_fix_pro_plan_pricing.sql`
16. `20250221000002_update_monthly_amount_calculation.sql`
17. `20250221000003_update_checklist_tasks_table.sql`
18. `20250221000004_fix_addon_rls_and_pricing.sql`

## After Fixing

Once all migrations have unique timestamps:

```bash
supabase db push --include-all
```

This should work without errors!
