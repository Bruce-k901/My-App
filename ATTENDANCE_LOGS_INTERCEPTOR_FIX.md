# Attendance Logs Interceptor Fix

## Problem

The fetch interceptor in `src/lib/supabase.ts` was incorrectly detecting ALL POST requests as write operations on `attendance_logs` view, even when the request was to `/rest/v1/notifications`. This caused:

1. False error messages about attendance_logs write operations
2. Incorrect redirects (trying to redirect notifications to staff_attendance)
3. 400 errors when creating notifications

## Root Cause

The interceptor was checking for write methods (POST/PATCH/PUT/DELETE) but NOT checking if the URL actually contained `attendance_logs`. This meant it was triggering on ALL POST requests, including legitimate notifications.

## Solution

Added a URL check to only trigger the attendance_logs redirect logic when the URL actually contains `/rest/v1/attendance_logs`.

**Before:**

```typescript
if (method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE') {
  // This triggered on ALL POST requests!
```

**After:**

```typescript
if ((method === 'POST' || method === 'PATCH' || method === 'PUT' || method === 'DELETE')
    && url.includes('/rest/v1/attendance_logs')) {
  // Now only triggers for actual attendance_logs requests
```

## Files Changed

- `src/lib/supabase.ts` - Added URL check to attendance_logs interceptor (line 149)

## Impact

- ✅ Notifications POST requests will no longer trigger false attendance_logs errors
- ✅ Late completion alerts will work correctly
- ✅ The interceptor will only trigger for actual attendance_logs write operations
- ✅ No breaking changes - the fix is more restrictive, not less

## Testing

- [ ] Verify notifications can be created without errors
- [ ] Verify late completion alerts work correctly
- [ ] Verify attendance_logs redirect still works if needed (shouldn't be needed if triggers are removed)
