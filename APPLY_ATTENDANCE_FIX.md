# Fix attendance_logs 404 Errors

## Problem

The app is getting 404 errors because the `attendance_logs` table doesn't exist in your Supabase database. The migrations have been created but need to be applied.

## Solution

### Step 1: Apply Migrations via Supabase Dashboard

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Run Migration 1** (Create attendance_logs table)
   - Open the file: `supabase/migrations/20250220000012_fix_attendance_logs_queries.sql`
   - Copy ALL the contents
   - Paste into SQL Editor
   - Click "Run" (or press Ctrl+Enter)
   - Wait for it to complete successfully

4. **Run Migration 2** (Update functions)
   - Open the file: `supabase/migrations/20250220000013_ensure_all_functions_use_staff_attendance.sql`
   - Copy ALL the contents
   - Paste into SQL Editor
   - Click "Run"
   - Wait for it to complete successfully

### Step 2: Verify the Fix

After running both migrations, verify the table exists:

```sql
-- Check if attendance_logs table exists
SELECT * FROM attendance_logs LIMIT 1;

-- Check if staff_attendance table exists
SELECT * FROM staff_attendance LIMIT 1;
```

Both queries should work without errors.

### Step 3: Test the App

1. Refresh your browser (hard refresh: Ctrl+Shift+R)
2. Try clocking in/out
3. The 404 errors should be gone

## What These Migrations Do

- **Migration 12**: Creates `attendance_logs` table that syncs with `staff_attendance`
- **Migration 13**: Ensures all database functions use `staff_attendance`

Both tables will stay in sync automatically via database triggers.

## Alternative: Using Supabase CLI

If you have Supabase CLI installed locally:

```bash
# Make sure you're in the project root
cd C:\Users\bruce\my-app

# Link to your project (if not already linked)
supabase link --project-ref xijoybubtrgbrhquqwrx

# Push migrations
supabase db push
```

## Troubleshooting

If you get errors when running the migrations:

1. **Check if staff_attendance table exists:**

   ```sql
   SELECT * FROM staff_attendance LIMIT 1;
   ```

2. **If staff_attendance doesn't exist, run this first:**
   - Apply migration `20250220000000_create_staff_attendance.sql`

3. **If you get permission errors:**
   - Make sure you're running as a database admin/superuser
   - Check your Supabase project settings

4. **If the table still doesn't exist after migration:**
   - Check the migration logs in Supabase Dashboard
   - Look for any error messages
   - Try running the migrations one at a time

## Need Help?

If errors persist after applying migrations, check:

- Supabase Dashboard → Database → Migrations (to see migration status)
- Browser console for any new error messages
- Network tab to see if queries are still failing
