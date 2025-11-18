# Fix for 406 Error on attendance_logs Queries

## Problem Summary

You're getting a **406 Not Acceptable** error (PGRST116) when querying `attendance_logs` with:

```
GET /rest/v1/attendance_logs?select=id&user_id=eq.xxx&clock_in_at::date=eq.2025-11-17&clock_out_at=is.null&site_id=eq.xxx
```

**Root Cause**: PostgREST (Supabase REST API) doesn't support PostgreSQL casting operators (`::date`) in URL filter parameters.

## Solution Applied

### 1. Database Migration (20250220000019)

A migration has been created that:

- ✅ Adds `clock_in_date` DATE column to `attendance_logs` table
- ✅ Creates a trigger to automatically populate `clock_in_date` from `clock_in_at`
- ✅ Backfills existing rows with the date value
- ✅ Creates indexes for performance

**Apply this migration in Supabase SQL Editor:**

```sql
-- Run: supabase/migrations/20250220000019_fix_attendance_logs_rest_api_query.sql
```

### 2. Client-Side Helper Functions

Created `src/lib/attendance-logs.ts` with helper functions that use the correct query pattern:

```typescript
import { isUserClockedInToday, getAttendanceLogForDate } from "@/lib/attendance-logs";

// ✅ CORRECT: Uses clock_in_date column
const isClockedIn = await isUserClockedInToday(userId, siteId, "2025-11-17");

// ❌ INCORRECT: Don't use clock_in_at::date
// This will cause 406 error
```

### 3. Query Pattern Changes

**Before (causes 406 error):**

```typescript
// ❌ This doesn't work with REST API
const { data } = await supabase
  .from("attendance_logs")
  .select("id")
  .eq("user_id", userId)
  .eq("clock_in_at::date", "2025-11-17") // ❌ Not supported
  .is("clock_out_at", null);
```

**After (works correctly):**

```typescript
// ✅ Use clock_in_date column instead
const { data } = await supabase
  .from("attendance_logs")
  .select("id")
  .eq("user_id", userId)
  .eq("clock_in_date", "2025-11-17") // ✅ Works!
  .is("clock_out_at", null);
```

## Finding the Source of the Query

The query might be coming from:

1. **Browser extension or dev tool** - Check browser Network tab for the failing request
2. **Cached code** - Clear browser cache and hard refresh
3. **Database function** - Check Supabase logs for functions making REST API calls
4. **Frontend code** - Search codebase for `clock_in_at::date` or `clock_in_at%3A%3Adate`

**To find it:**

1. Open browser DevTools → Network tab
2. Look for the failing request to `attendance_logs`
3. Check the "Initiator" or "Call Stack" to see what code triggered it
4. Or check Supabase Dashboard → Logs → API Logs → filter by `attendance_logs`

## Alternative: Use RPC Functions

If you need complex date filtering, use the RPC functions instead:

```typescript
// ✅ Use RPC function (avoids REST API limitations)
const { data } = await supabase.rpc("is_user_clocked_in_today", {
  p_user_id: userId,
  p_site_id: siteId,
  p_date: "2025-11-17",
});
```

Available RPC functions:

- `is_user_clocked_in_today(p_user_id, p_site_id, p_date)`
- `get_attendance_logs_by_date(p_site_id, p_date, p_user_id)`
- `get_active_attendance_logs(p_site_id, p_date)`

## Next Steps

1. ✅ **Apply Migration 20250220000019** in Supabase SQL Editor
2. ✅ **Use helper functions** from `src/lib/attendance-logs.ts` for new code
3. 🔍 **Find and update** any existing code using `clock_in_at::date`
4. ✅ **Test** that queries work without 406 errors

## Verification

After applying the migration, test with:

```typescript
import { isUserClockedInToday } from "@/lib/attendance-logs";

// This should work without 406 error
const result = await isUserClockedInToday(
  "8066c4f2-fbff-4255-be96-71acf151473d",
  "1d5d6f99-72cc-4335-946d-13ff8f0b0419",
  "2025-11-17",
);
```

If you still see 406 errors, check:

- Migration was applied successfully
- `clock_in_date` column exists in `attendance_logs` table
- No cached code is still using old query pattern
- Browser extensions aren't making the query
