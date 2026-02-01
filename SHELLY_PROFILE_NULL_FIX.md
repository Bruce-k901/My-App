# Fix for Shelly's Profile Null Data Issue

## Issue

Shelly is getting 406 errors and the profile query is returning `null` data with no error:

```
Profile query result (AppContext): {data: null, error: null, userId: 'b7e28f87-fee8-4ca9-bad2-b5ac003acb62'}
```

This suggests RLS is blocking the query silently (returning null instead of an error).

## Root Causes

1. **RLS Policy Missing/Incorrect**: The `profiles_select_own` policy might not exist or be misconfigured
2. **Profile ID Mismatch**: The profile `id` might not match `auth.uid()`
3. **Profile Doesn't Exist**: The profile might not have been created properly

## Fixes Applied

### 1. Improved Null Data Handling (`src/context/AppContext.tsx`)

- Added fallback to API route when profile query returns `null` data with no error
- This handles cases where RLS blocks silently

### 2. Enhanced Error Detection (`src/lib/companyHelpers.ts`)

- Added detection for null data (RLS blocking silently)
- Falls back to API route when null data is returned

### 3. BusinessDetailsTab Fallback (`src/components/organisation/BusinessDetailsTab.tsx`)

- Added API route fallback for both 406 errors and null data
- Better error logging

## Steps to Fix

### Step 1: Run RLS Fix Script

Run `supabase/sql/fix_profiles_rls_406_error.sql` in Supabase SQL Editor to ensure RLS policies are correct.

### Step 2: Run Diagnostic Script

Run `supabase/sql/diagnose_shelly_profile_406.sql` to check:

- If Shelly's profile exists
- If profile ID matches auth user ID
- If RLS policies are active

### Step 3: Check Profile Creation

If the diagnostic shows the profile doesn't exist or IDs don't match, you may need to:

1. Create the profile manually, OR
2. Re-add Shelly to the company (which should create/update the profile)

## Diagnostic Queries

### Check if Profile Exists

```sql
SELECT * FROM public.profiles WHERE email = 'lee@e-a-g.co';
```

### Check if Auth User Exists

```sql
SELECT * FROM auth.users WHERE email = 'lee@e-a-g.co';
```

### Check if IDs Match

```sql
SELECT
  au.id AS auth_user_id,
  p.id AS profile_id,
  au.id = p.id AS ids_match
FROM auth.users au
LEFT JOIN public.profiles p ON p.email = au.email
WHERE au.email = 'lee@e-a-g.co';
```

### Check RLS Policies

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';
```

## Expected Behavior After Fix

1. **If RLS is fixed**: Profile queries should work directly, no 406 errors
2. **If RLS still blocks**: Code will automatically fall back to API route, no 406 errors visible to user
3. **If profile doesn't exist**: User will see appropriate error message

## Files Modified

- ✅ `src/context/AppContext.tsx` - Added null data fallback
- ✅ `src/lib/companyHelpers.ts` - Enhanced 406/null detection
- ✅ `src/components/organisation/BusinessDetailsTab.tsx` - Added API route fallback

## Next Steps

1. **Run the diagnostic script** to see what's actually wrong
2. **Run the RLS fix script** to ensure policies are correct
3. **Check if profile exists** using the diagnostic queries
4. **If profile doesn't exist**, re-add Shelly to the company

The code now has multiple fallbacks, so even if RLS blocks, it should work via the API route. But it's better to fix the root cause (RLS policies).









