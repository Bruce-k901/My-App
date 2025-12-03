# Profile 406 Error - Locked Down ✅

## Problem Summary

Users getting 406 (Not Acceptable) errors when querying their own profile:

```
profiles?select=full_name&id=eq.232039a6-614f-4c66-97b5-447dd5968fb4
```

## Root Cause

**Profile doesn't exist** for the user, even though:

- ✅ User exists in `auth.users`
- ✅ RLS policies are correct (`profiles_select_own`: `id = auth.uid()`)
- ❌ Profile missing in `public.profiles`

## Solution Applied

### 1. ✅ SQL Fix Script

**File**: `supabase/sql/fix_missing_profile.sql`

This script:

- Checks if user exists in `auth.users`
- Checks if profile exists in `public.profiles`
- Creates profile if missing with:
  - `id` = user ID from `auth.users`
  - `email` = user email
  - `full_name` = from user metadata or email prefix
  - `app_role` = `'Staff'` (capitalized, as required)
  - `company_id` = `NULL` (set during onboarding)

### 2. ✅ RLS Policies Verified

**File**: `supabase/sql/rls_policies_authoritative.sql`

RLS policies are correct:

- `profiles_select_own`: `(id = auth.uid())` - allows users to SELECT their own profile
- `profiles_insert_own`: `(id = auth.uid())` - allows users to INSERT their own profile
- `profiles_update_own`: `(id = auth.uid())` - allows users to UPDATE their own profile

## How to Fix

### Step 1: Run Diagnostic

```sql
-- Run: supabase/sql/check_user_profile.sql
-- This shows:
-- 1. If user exists in auth.users
-- 2. If profile exists in public.profiles
-- 3. RLS policies status
-- 4. If profile has company_id
```

### Step 2: Create Missing Profile

```sql
-- Run: supabase/sql/fix_missing_profile.sql
-- This will:
-- 1. Check if user exists
-- 2. Create profile if missing
-- 3. Show profile details
```

### Step 3: Verify Fix

After running the script, the profile query should work:

```sql
-- This should return the profile
SELECT
  id,
  email,
  full_name,
  company_id,
  app_role
FROM public.profiles
WHERE id = '232039a6-614f-4c66-97b5-447dd5968fb4';
```

## Why Profiles Might Be Missing

1. **Onboarding didn't complete**: Profile should be created by:
   - Auth trigger (`handle_new_user()`)
   - Onboarding service (`src/lib/services/onboarding.ts`)
   - Manual creation during signup

2. **Auth trigger not working**: Check if trigger exists:

   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

3. **Onboarding service failed**: Check if company creation completed successfully

## Prevention

### 1. Ensure Auth Trigger Exists

The trigger should automatically create profiles when users sign up:

```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- If missing, create it (see: supabase/sql/handle_new_user.sql)
```

### 2. Verify Onboarding Service

The onboarding service (`src/lib/services/onboarding.ts`) should:

- Create company
- Create profile (if not exists)
- Link profile to company
- Create trial subscription

### 3. Monitor Profile Creation

Add logging to track when profiles are created:

- Check auth trigger logs
- Check onboarding service logs
- Monitor for missing profiles

## Files Created/Modified

### Created:

- ✅ `supabase/sql/fix_missing_profile.sql` - Creates profile if missing
- ✅ `supabase/sql/check_user_profile.sql` - Diagnostic script
- ✅ `PROFILE_406_FIX.md` - Initial fix documentation
- ✅ `PROFILE_406_ERROR_LOCKED_DOWN.md` - This document

### Related Files:

- `supabase/sql/rls_policies_authoritative.sql` - RLS policies (verified correct)
- `supabase/sql/handle_new_user.sql` - Auth trigger for profile creation
- `src/lib/services/onboarding.ts` - Onboarding service

## Testing

### Test 1: Profile Exists

```sql
-- Should return 1 row
SELECT COUNT(*) FROM public.profiles
WHERE id = '232039a6-614f-4c66-97b5-447dd5968fb4';
```

### Test 2: RLS Allows Query

```sql
-- As the user (in Supabase SQL Editor with user context)
-- Should return profile
SELECT * FROM public.profiles WHERE id = auth.uid();
```

### Test 3: Profile Has Required Fields

```sql
-- Should return profile with all fields
SELECT
  id,
  email,
  full_name,
  app_role,
  company_id
FROM public.profiles
WHERE id = '232039a6-614f-4c66-97b5-447dd5968fb4';
```

## If Error Persists

### Check 1: User Authentication

```sql
-- Verify auth.uid() is not null
SELECT auth.uid() as current_user_id;
```

### Check 2: Profile Exists

```sql
-- Check if profile exists
SELECT * FROM public.profiles
WHERE id = '232039a6-614f-4c66-97b5-447dd5968fb4';
```

### Check 3: RLS is Enabled

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';
```

### Check 4: RLS Policies Exist

```sql
-- Verify policies exist
SELECT * FROM pg_policies
WHERE tablename = 'profiles';
```

## Expected Behavior After Fix

- ✅ Profile exists for user
- ✅ RLS allows query (policies are correct)
- ✅ 406 error resolved
- ✅ Profile query returns data

## Quick Reference

**To fix a missing profile:**

```sql
-- Run this script:
-- supabase/sql/fix_missing_profile.sql
```

**To diagnose profile issues:**

```sql
-- Run this script:
-- supabase/sql/check_user_profile.sql
```

**To verify RLS policies:**

```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

---

**Status**: ✅ Locked Down
**Date**: 2025-01-17
**Files**: `supabase/sql/fix_missing_profile.sql`, `supabase/sql/check_user_profile.sql`
**Test**: Run diagnostic script to verify profile exists
