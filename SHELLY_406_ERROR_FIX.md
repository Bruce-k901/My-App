# Fix for Shelly's 406 Error

## Issue

Shelly (and other users) are getting 406 (Not Acceptable) errors when trying to access their profile:

```
GET /rest/v1/profiles?select=company_id&id=eq.b7e28f87-fee8-4ca9-bad2-b5ac003acb62 406 (Not Acceptable)
```

## Root Cause

Row Level Security (RLS) policies are blocking users from reading their own profile. This happens when:

1. RLS is enabled on the `profiles` table
2. The `profiles_select_own` policy doesn't exist or is misconfigured
3. The user's profile `id` doesn't match `auth.uid()`

## Fixes Applied

### 1. Fixed RLS Policy (`supabase/sql/fix_profiles_rls_406_error.sql`)

Created a script that:

- Ensures RLS is enabled
- Drops conflicting policies
- Creates proper policies for SELECT, UPDATE, and INSERT
- Allows users to access their own profile (`id = auth.uid() = id`)

### 2. Improved Error Handling (`src/context/AppContext.tsx`)

- Enhanced 406 error detection (checks for multiple error indicators)
- Improved API route fallback when RLS blocks direct queries
- Better error logging

## Steps to Fix

### Step 1: Run the RLS Fix Script

Run this SQL script in Supabase SQL Editor:

```sql
-- File: supabase/sql/fix_profiles_rls_406_error.sql
```

This will:

1. Enable RLS on profiles table
2. Drop existing conflicting policies
3. Create proper policies for users to access their own profile

### Step 2: Verify Policies

After running the script, verify policies exist:

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';
```

You should see:

- `profiles_select_own` - FOR SELECT USING (id = auth.uid())
- `profiles_update_own` - FOR UPDATE USING (id = auth.uid())
- `profiles_insert_own` - FOR INSERT WITH CHECK (id = auth.uid())

### Step 3: Test

1. Have Shelly log out and log back in
2. Check browser console - should see:
   - `✅ Profile loaded via API route fallback` (if RLS still blocks)
   - Or no 406 errors if RLS is fixed

## If Still Getting 406 Errors

### Check 1: Verify Profile ID Matches Auth UID

```sql
SELECT
  p.id AS profile_id,
  p.email,
  au.id AS auth_user_id,
  p.id = au.id AS ids_match
FROM public.profiles p
LEFT JOIN auth.users au ON au.email = p.email
WHERE p.email = 'lee@e-a-g.co';
```

If `ids_match` is `false`, the profile `id` doesn't match the auth user `id`. This needs to be fixed.

### Check 2: Verify RLS Policies Are Active

```sql
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';
```

Should see `rls_enabled = true`.

### Check 3: Test Policy Directly

```sql
-- This should return the user's profile when run as that user
SELECT * FROM public.profiles WHERE id = auth.uid();
```

If this returns no rows, the policy isn't working correctly.

## Fallback Solution

The code now has a fallback that uses the API route (`/api/profile/get`) when RLS blocks direct queries. This should work even if RLS policies aren't perfect, but it's better to fix the RLS policies properly.

## Files Modified

- ✅ `supabase/sql/fix_profiles_rls_406_error.sql` - RLS fix script
- ✅ `src/context/AppContext.tsx` - Improved 406 error handling

## Next Steps

1. **Run the SQL script** to fix RLS policies
2. **Have Shelly log out and log back in**
3. **Check browser console** for 406 errors
4. **If still getting errors**, check the verification queries above
