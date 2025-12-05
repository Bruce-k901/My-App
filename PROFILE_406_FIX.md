# Profile 406 Error Fix

## Problem

Getting 406 error when querying profile:

```
profiles?select=full_name&id=eq.232039a6-614f-4c66-97b5-447dd5968fb4
```

## Root Cause

The RLS policies are **correct** (as shown in your diagnostic output):

- ✅ `profiles_select_own`: `(id = auth.uid())` - allows users to SELECT their own profile

The 406 error means one of:

1. **Profile doesn't exist** for this user
2. **`auth.uid()` is null** (user not authenticated when query runs)
3. **User ID mismatch** between query and `auth.uid()`

## Solution

### Step 1: Check if Profile Exists

Run this in Supabase SQL Editor:

```sql
SELECT
  'User exists' as check_type,
  id,
  email,
  created_at
FROM auth.users
WHERE id = '232039a6-614f-4c66-97b5-447dd5968fb4';

SELECT
  'Profile exists' as check_type,
  id,
  email,
  full_name,
  company_id,
  app_role
FROM public.profiles
WHERE id = '232039a6-614f-4c66-97b5-447dd5968fb4';
```

### Step 2: Create Profile if Missing

If profile doesn't exist, run:

```sql
-- Copy and paste contents of:
-- supabase/sql/fix_missing_profile.sql
```

This will:

- ✅ Check if user exists in auth.users
- ✅ Create profile if missing
- ✅ Set default values (email, full_name from user metadata, app_role='staff')

### Step 3: Verify Profile Can Be Queried

After creating profile, test the query:

```sql
-- This should work if profile exists and RLS is correct
SELECT
  id,
  email,
  full_name,
  company_id,
  app_role
FROM public.profiles
WHERE id = '232039a6-614f-4c66-97b5-447dd5968fb4';
```

## Why Profile Might Be Missing

1. **Onboarding didn't complete**: Profile should be created by:
   - Auth trigger (if configured)
   - Onboarding service (`src/lib/services/onboarding.ts`)
   - Manual creation during signup

2. **Auth trigger not working**: Check if there's a trigger that creates profiles on user signup

3. **Onboarding service failed**: Check if company creation completed successfully

## Expected Behavior After Fix

- ✅ Profile exists for user
- ✅ RLS allows query (policies are correct)
- ✅ 406 error should be resolved

## If Error Persists

If profile exists but still getting 406:

1. **Check authentication**: Verify `auth.uid()` is not null

   ```sql
   -- Run as the user (in Supabase SQL Editor with user context)
   SELECT auth.uid() as current_user_id;
   ```

2. **Check user ID match**: Verify the user ID in the query matches `auth.uid()`
   - Query uses: `232039a6-614f-4c66-97b5-447dd5968fb4`
   - `auth.uid()` should return the same value

3. **Check RLS is enabled**: Verify RLS is enabled on profiles table
   ```sql
   SELECT tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public' AND tablename = 'profiles';
   ```

---

**Status**: ✅ RLS policies are correct
**Action Required**: Check if profile exists, create if missing using `supabase/sql/fix_missing_profile.sql`
