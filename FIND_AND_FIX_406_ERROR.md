# How to Find and Fix the 406 Error

## The Problem

You're getting a **406 Not Acceptable** error from this query:

```
GET /rest/v1/attendance_logs?select=id&user_id=eq.xxx&clock_in_at%3A%3Adate=eq.2025-11-17&clock_out_at=is.null&site_id=eq.xxx
```

The `clock_in_at%3A%3Adate` (URL-encoded `clock_in_at::date`) is not supported by PostgREST.

## Step 1: Apply the Database Migration

**First, apply migration `20250220000019_fix_attendance_logs_rest_api_query.sql`** in Supabase SQL Editor. This adds the `clock_in_date` column that makes REST API queries work.

## Step 2: Find the Source

The query is coming from client-side code. To find it:

### Method 1: Browser DevTools (Easiest)

1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Filter by `attendance_logs`
4. Find the failing request
5. Click on it → **Initiator** tab
6. This shows the call stack - look for your code files

### Method 2: Search Codebase

Search for these patterns:

```bash
# Search for attendance_logs queries
grep -r "attendance_logs" src/

# Search for date filter patterns
grep -r "clock_in_at" src/
grep -r "::date" src/
```

### Method 3: Check Common Locations

The query pattern suggests it's checking if a user is clocked in today. Check:

1. **Notification system** - `src/lib/notifications/`
2. **Hooks** - `src/hooks/useAttendance.ts` or similar
3. **Components** - Any component that checks clock-in status
4. **Service workers** - Check `public/sw.js` if it exists
5. **Cached code** - Clear browser cache and hard refresh (Ctrl+Shift+R)

## Step 3: Fix the Query

Once you find the source, update it to use `clock_in_date`:

### ❌ Before (causes 406):

```typescript
const { data } = await supabase
  .from("attendance_logs")
  .select("id")
  .eq("user_id", userId)
  .eq("clock_in_at::date", "2025-11-17") // ❌ Doesn't work
  .is("clock_out_at", null)
  .eq("site_id", siteId);
```

### ✅ After (works):

```typescript
const { data } = await supabase
  .from("attendance_logs")
  .select("id")
  .eq("user_id", userId)
  .eq("clock_in_date", "2025-11-17") // ✅ Use clock_in_date column
  .is("clock_out_at", null)
  .eq("site_id", siteId);
```

### ✅ Or Use Helper Function:

```typescript
import { isUserClockedInToday } from "@/lib/attendance-logs";

const isClockedIn = await isUserClockedInToday(userId, siteId, "2025-11-17");
```

### ✅ Or Use RPC Function:

```typescript
const { data } = await supabase.rpc("is_user_clocked_in_today", {
  p_user_id: userId,
  p_site_id: siteId,
  p_date: "2025-11-17",
});
```

## Step 4: Verify the Fix

1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R)
3. Check Network tab - the 406 error should be gone
4. Verify the query now uses `clock_in_date` instead of `clock_in_at::date`

## Common Sources

Based on the query pattern, it's likely checking if a user is clocked in today. Common sources:

1. **Notification system** checking if user should receive notifications
2. **Task assignment** checking if user is available
3. **Dashboard** showing clock-in status
4. **Service worker** checking attendance status

## If You Can't Find It

If you can't find the source:

1. **Check Supabase Logs**:
   - Go to Supabase Dashboard → Logs → API Logs
   - Filter by `attendance_logs`
   - Look for the request details

2. **Check Browser Extensions**:
   - Disable browser extensions
   - Some extensions might be making API calls

3. **Check Service Workers**:
   - DevTools → Application → Service Workers
   - Unregister service workers and test

4. **Use Migration to Add View**:
   The migration creates views that can be used instead:
   ```typescript
   // Use view instead of direct table query
   const { data } = await supabase
     .from("todays_attendance_logs_view")
     .select("id")
     .eq("user_id", userId)
     .is("clock_out_at", null)
     .eq("site_id", siteId);
   ```

## Quick Fix Summary

1. ✅ Apply migration `20250220000019_fix_attendance_logs_rest_api_query.sql`
2. 🔍 Find source using browser DevTools Network tab
3. 🔧 Update query to use `clock_in_date` instead of `clock_in_at::date`
4. ✅ Test and verify 406 error is gone
