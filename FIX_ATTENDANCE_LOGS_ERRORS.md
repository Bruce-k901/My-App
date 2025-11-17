# Fix attendance_logs 404 Errors

## Problem Summary

The `attendance_logs` table was dropped in migration `20250220000003_drop_old_attendance_logs_table.sql`, but there are still queries being made to it, causing 404 errors.

## Error Details

The error shows queries like:

```
/rest/v1/attendance_logs?select=id&user_id=eq.8066c4f2-fbff-4255-be96-71acf151473d&clock_out_at=is.null&clock_in_at::date=eq.2025-11-17&site_id=eq.1d5d6f99-72cc-4335-946d-13ff8f0b0419
```

This query is checking if a user was clocked in on a specific date using the old table structure.

## Root Cause

The query is likely coming from:

1. A database view that wasn't updated
2. A stored procedure/function that wasn't updated
3. Client-side code that's dynamically constructing queries (less likely, as we've checked the main files)

## Solution

### ✅ Fixed Issues

1. **Contractors Address Field** - Fixed in `AddContractorModal.tsx`
   - Removed `address` field from database insert/update
   - Address is now stored in `notes` field if provided
   - The UI still collects address, but it's saved to notes

2. **Migration Created** - `20250220000004_fix_remaining_attendance_references.sql`
   - Ensures all views use `staff_attendance`
   - Recreates `todays_attendance` view
   - Verifies `is_user_clocked_in` function uses correct table

### 1. Run the Migration

Apply the new migration:

```bash
# In Supabase dashboard SQL editor, run:
supabase/migrations/20250220000004_fix_remaining_attendance_references.sql
```

### 2. Check for Remaining Views/Functions

Run this SQL to find any remaining references:

```sql
-- Find all views that might reference attendance_logs
SELECT
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE definition LIKE '%attendance_logs%'
   OR definition LIKE '%clock_in_at%';

-- Find all functions that might reference attendance_logs
SELECT
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND (pg_get_functiondef(p.oid) LIKE '%attendance_logs%'
       OR pg_get_functiondef(p.oid) LIKE '%clock_in_at%');
```

### 3. Clear Browser Cache

The 404 errors might be from cached queries. Try:

1. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Open in incognito/private mode

### 4. Client-Side Code Status

All main files have been verified and are using `staff_attendance`:

- ✅ `src/lib/notifications/attendance.ts` - Uses `staff_attendance`
- ✅ `src/hooks/useAttendance.ts` - Uses `staff_attendance`
- ✅ `src/lib/shift-utils.ts` - Uses `staff_attendance`
- ✅ `src/app/api/attendance/*` - Uses `staff_attendance`

## Other Errors Found

### ✅ 1. Contractors Table - Missing 'address' Column (400 error) - FIXED

**Error**: `Could not find the 'address' column of 'contractors' in the schema cache`

**Fix Applied**:

- Updated `AddContractorModal.tsx` to remove `address` from database operations
- Address is now stored in `notes` field if provided
- The UI still collects address for user convenience, but it's saved to notes

### 2. task_templates RLS (403 error)

**Error**: `Failed to load resource: the server responded with a status of 403`

**Fix**: Check RLS policies on `task_templates` table.

### 3. ppm_schedules RLS (403 error)

**Error**: `Failed to load resource: the server responded with a status of 403`

**Fix**: Check RLS policies on `ppm_schedules` table.

### 4. ppm_schedule Table Name (400 error)

**Error**: Querying `ppm_schedule` (singular) but table might be `ppm_schedules` (plural)

**Fix**: Check table name consistency.

### 5. profiles Query with IN Clause (400 error)

**Error**: Query with large IN clause failing

**Fix**: Consider using a join or breaking into smaller queries.

## Next Steps

1. Run the SQL queries above to find remaining references
2. Update any found views/functions
3. Fix the contractors address column issue
4. Review RLS policies for task_templates and ppm_schedules
5. Check table name consistency for ppm tables
