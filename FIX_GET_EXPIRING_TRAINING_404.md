# Fix: get_expiring_training 404/400 Error

## Problem

The application was throwing errors when trying to call the `get_expiring_training` RPC function:

- **404 (Not Found)**: Function doesn't exist in the database
- **400 (Bad Request)**: Function exists but has parameter/signature issues

This error occurs because:
1. The function doesn't exist in the Supabase database, OR
2. The function exists but has a different signature than expected (parameter mismatch)

## Root Cause

The function `get_expiring_training` is defined in the migration file `supabase/migrations/20250305000002_create_training_records.sql`, but:

1. The migration may not have been run yet
2. The function is wrapped in a conditional block that only creates it if certain tables exist (`training_records`, `profiles`, `training_courses`)
3. If those tables don't exist, the function won't be created

## Solution

### Option 1: Run the Standalone SQL File (Recommended)

Run the standalone SQL file to create/update the function with the correct signature:

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of: `supabase/sql/create_get_expiring_training_function.sql`
3. Click "Run"
4. Verify the function was created/updated successfully

**Note:** If you're getting a 400 error, the function may already exist with a different signature. Running this SQL will replace it with the correct version.

### Option 2: Run the Full Migration

If you haven't run the training records migration yet:

1. Open Supabase Dashboard → SQL Editor
2. Run: `supabase/migrations/20250305000002_create_training_records.sql`
3. This will create the `training_records` table and all related functions

## Code Changes

The code has been updated to handle missing functions and parameter errors gracefully:

1. **`src/app/dashboard/people/page.tsx`**: Updated `fetchDashboardData` to check for 404 and 400 errors and handle them silently
2. **`src/app/dashboard/people/training/page.tsx`**: Updated `fetchExpiring` to handle missing function and parameter errors gracefully
3. **`supabase/sql/create_get_expiring_training_function.sql`**: Fixed function signature to match the original migration exactly

The application will now:
- Return an empty array if the function doesn't exist (404) or has parameter issues (400)
- Silently handle these errors (no console spam)
- Continue functioning normally without the training expiry data

## Verification

After running the SQL file, verify the function exists:

```sql
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_expiring_training';
```

You should see the function listed.

## Testing

1. After creating the function, refresh the People Dashboard
2. The 404 error should no longer appear in the console
3. If you have training records with expiry dates, they should appear in the dashboard

## Files Changed

- ✅ `supabase/sql/create_get_expiring_training_function.sql` (new file)
- ✅ `src/app/dashboard/people/page.tsx` (updated error handling)
- ✅ `src/app/dashboard/people/training/page.tsx` (updated error handling)

