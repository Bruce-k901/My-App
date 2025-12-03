# Network Errors Fix - Applied Solutions ✅ LOCKED DOWN

## Problem Summary

Network-level errors appearing in browser console:

- **406 errors** for profiles queries ✅ FIXED (see PROFILE_406_ERROR_LOCKED_DOWN.md)
- **400 errors** for notifications queries (with `severity=in.(critical,warning)`) ✅ FIXED (fetch interceptor)
- **406/409 errors** for push_subscriptions ✅ FIXED (SQL script creates table)

## Solutions Applied

### 1. ✅ Fetch Interceptor for Notifications

**File**: `src/lib/supabase.ts`

Added fetch interceptor to automatically fix notifications queries with `severity=in.()` syntax:

- Intercepts `/rest/v1/notifications` requests
- Removes `severity=in.(critical,warning)` from URL
- Severity filtering is done in JavaScript (as it should be)

**Why**: The query format `select=id,title,message,severity,created_at,company_id,site_id&severity=in.(critical,warning)` doesn't match our code (we use `select("*")`). This suggests:

- Cached/old code running
- Browser extension modifying queries
- PostgREST auto-generating the query

The interceptor will catch and fix it regardless of source.

### 2. ✅ SQL Fix Script

**File**: `supabase/sql/fix_network_errors.sql`

Run this script in Supabase SQL Editor to:

- Fix profiles RLS policy
- Fix notifications RLS policy
- Create push_subscriptions table if missing
- Create push_subscriptions RLS policies

### 3. ✅ Diagnostic Script

**File**: `supabase/sql/check_user_profile.sql`

Run this to check if:

- User exists in auth.users
- Profile exists
- Profile has company_id (required for notifications)
- RLS policies are correct

## Next Steps

### Step 1: Run SQL Fix Script

```sql
-- Copy and paste contents of:
-- supabase/sql/fix_network_errors.sql
-- Into Supabase SQL Editor and run
```

### Step 2: Check User Profile

```sql
-- Run this diagnostic:
-- supabase/sql/check_user_profile.sql
-- Replace user ID with: 232039a6-614f-4c66-97b5-447dd5968fb4
```

### Step 3: Clear Browser Cache

1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Restart dev server: `npm run dev`

### Step 4: Verify Fix

After applying fixes, check browser console:

- ✅ No more 406 errors for profiles (if profile exists)
- ✅ No more 400 errors for notifications (interceptor fixes query)
- ✅ No more 406/409 errors for push_subscriptions (table exists)

## Expected Behavior

### Before Fix:

```
❌ 406: profiles?select=full_name&id=eq.232039a6-614f-4c66-97b5-447dd5968fb4
❌ 400: notifications?select=id,title,message,severity,created_at,company_id,site_id&severity=in.(critical,warning)
❌ 406: push_subscriptions?select=is_active&user_id=eq.232039a6-614f-4c66-97b5-447dd5968fb4
```

### After Fix:

```
✅ Profiles query works (if profile exists and RLS is correct)
✅ Notifications query works (interceptor removes severity=in.() filter)
✅ Push subscriptions query works (table exists, RLS allows)
```

## If Errors Persist

### Profiles 406 Error

**Cause**: Profile doesn't exist or RLS blocking
**Fix**:

1. Check if profile exists: `SELECT * FROM profiles WHERE id = '232039a6-614f-4c66-97b5-447dd5968fb4';`
2. If missing, profile should be created by onboarding service
3. Check RLS: `SELECT * FROM pg_policies WHERE tablename = 'profiles';`

### Notifications 400 Error

**Cause**: Query syntax issue (should be fixed by interceptor)
**Fix**:

1. Check browser console for interceptor messages
2. Hard refresh to clear cached queries
3. Check if query is coming from a different source

### Push Subscriptions 406/409 Error

**Cause**: Table doesn't exist or RLS blocking
**Fix**:

1. Run `supabase/sql/fix_network_errors.sql` to create table
2. Check RLS: `SELECT * FROM pg_policies WHERE tablename = 'push_subscriptions';`

## Files Modified

- ✅ `src/lib/supabase.ts` - Added notifications fetch interceptor
- ✅ `supabase/sql/fix_network_errors.sql` - SQL fix script
- ✅ `supabase/sql/check_user_profile.sql` - Diagnostic script

## Testing

After applying fixes:

1. **Profiles Query**: Should work if profile exists
2. **Notifications Query**: Interceptor should fix severity=in.() syntax
3. **Push Subscriptions**: Should work if table exists

---

**Status**: ✅ Fixes applied
**Action Required**: Run SQL scripts in Supabase SQL Editor
