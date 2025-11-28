# Attendance Logs Migrations - Important Order

## Migration Order

These migrations MUST be run in order:

1. **20250221000008** - Creates the attendance_logs view
2. **20250221000009** - Fixes RLS and updates functions
3. **20250221000010** - **PERMANENT FIX** - Comprehensive solution (run this last)

## Quick Fix

If you're experiencing 406 errors, run migration **20250221000010** - it includes everything from previous migrations and is idempotent (safe to run multiple times).

## Verification

After running migrations, verify everything works:

```sql
-- Run the verification function
SELECT * FROM verify_attendance_logs_setup();

-- All checks should return PASS
```

## If Migrations Fail

1. Check if `staff_attendance` table exists
2. Check if you have proper permissions
3. Run migrations one at a time to see which one fails
4. Check the error message for specific issues

## Never Delete These Migrations

These migrations are critical for the application to work. Never delete or modify them without understanding the full impact.
