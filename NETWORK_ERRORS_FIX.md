# Network Errors Fix (406/400) - Root Cause Resolution

## Problem

Network-level errors appearing in browser console:

- **406 errors** for profiles queries
- **400 errors** for notifications queries
- **406/409 errors** for push_subscriptions

These are **browser Network tab errors** that can't be suppressed at the console level, but we can fix the root causes.

## Root Causes

### 1. Profiles 406 Error

**Cause**: RLS policy blocking access or profile doesn't exist

- User ID: `232039a6-614f-4c66-97b5-447dd5968fb4`
- Query: `select=full_name&id=eq.232039a6-614f-4c66-97b5-447dd5968fb4`
- **Possible issues**:
  - Profile doesn't exist for this user
  - RLS policy is blocking (should allow `id = auth.uid()`)
  - `auth.uid()` is null (user not authenticated)

### 2. Notifications 400 Error

**Cause**: Query syntax issue with `severity=in.(critical,warning)`

- The URL shows: `severity=in.(critical,warning)`
- This suggests a query is using `.in()` filter which might have syntax issues
- **Note**: Our code uses `select("*")` and filters in JavaScript, so this might be:
  - A cached query
  - A different component
  - A browser extension modifying queries

### 3. Push Subscriptions 406/409 Error

**Cause**: Table doesn't exist or RLS blocking

- **406**: Table doesn't exist or RLS blocking SELECT
- **409**: Conflict on unique constraint (duplicate subscription)

## Solutions

### Solution 1: Run SQL Fix Script

```bash
# Apply the fix script
psql -f supabase/sql/fix_network_errors.sql
```

This will:

- ✅ Verify/update profiles RLS policy
- ✅ Verify/update notifications RLS policy
- ✅ Create push_subscriptions table if missing
- ✅ Create push_subscriptions RLS policies

### Solution 2: Verify Profile Exists

```sql
-- Check if profile exists for user
SELECT
  u.id as user_id,
  u.email,
  p.id as profile_id,
  p.company_id,
  p.full_name
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.id = '232039a6-614f-4c66-97b5-447dd5968fb4';
```

If profile doesn't exist:

- Profile should be created by auth trigger or onboarding service
- Check if onboarding completed successfully
- Check if auth trigger is working

### Solution 3: Check RLS Policies

```sql
-- Check all profiles policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- Check notifications policies
SELECT * FROM pg_policies WHERE tablename = 'notifications';

-- Check push_subscriptions policies
SELECT * FROM pg_policies WHERE tablename = 'push_subscriptions';
```

### Solution 4: Suppress Network Errors in Browser

These are browser Network tab errors - they can't be suppressed programmatically, but:

- ✅ They're already handled gracefully in code (errors are caught)
- ✅ They don't break functionality
- ✅ They're expected when:
  - Profile doesn't exist yet (during signup)
  - RLS is blocking (by design)
  - Table doesn't exist (push_subscriptions)

## Files Created

- `supabase/sql/fix_network_errors.sql` - SQL script to fix all issues
- `NETWORK_ERRORS_FIX.md` - This documentation

## Testing

After applying the fix:

1. **Check Profiles Query**:

   ```sql
   -- As the user, this should work:
   SELECT full_name FROM profiles WHERE id = auth.uid();
   ```

2. **Check Notifications Query**:

   ```sql
   -- As the user, this should work:
   SELECT * FROM notifications
   WHERE company_id IN (
     SELECT company_id FROM profiles WHERE id = auth.uid()
   )
   LIMIT 50;
   ```

3. **Check Push Subscriptions**:
   ```sql
   -- Table should exist:
   SELECT * FROM push_subscriptions LIMIT 1;
   ```

## Expected Behavior After Fix

- ✅ **Profiles 406**: Should be resolved if profile exists and RLS is correct
- ✅ **Notifications 400**: Should be resolved if profile has company_id
- ✅ **Push Subscriptions 406/409**: Should be resolved (table exists, RLS allows)

## If Errors Persist

1. **Profile doesn't exist**:
   - Check onboarding flow
   - Check auth trigger
   - Manually create profile if needed

2. **Profile exists but no company_id**:
   - User needs to complete company setup
   - Check onboarding service

3. **RLS still blocking**:
   - Verify `auth.uid()` is not null
   - Check policy syntax
   - Verify user is authenticated

## Related Files

- `supabase/sql/rls_policies_authoritative.sql` - Main RLS policies
- `src/lib/services/onboarding.ts` - Profile creation service
- `src/components/dashboard/WelcomeHeader.tsx` - Profiles query
- `src/components/dashboard/AlertsFeed.tsx` - Notifications query

---

**Status**: ✅ Fix script created
**Action Required**: Run `supabase/sql/fix_network_errors.sql` to apply fixes
