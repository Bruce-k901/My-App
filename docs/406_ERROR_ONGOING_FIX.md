# 406 Error Ongoing Fix - attendance_logs Query

**Date:** February 2025  
**Issue:** 406 (Not Acceptable) error from `attendance_logs` queries using `clock_in_at::date`  
**Status:** 🔍 **INVESTIGATING** - Need to find source of query

---

## 🐛 Problem

Still getting 406 errors from queries like:

```
GET /rest/v1/attendance_logs?select=id&clock_in_at::date=eq.2025-11-18&site_id=eq.xxx
```

**Error:** `406 (Not Acceptable)`

**URL Decoded:**

```
GET /rest/v1/attendance_logs?select=id&clock_in_at::date=eq.2025-11-18&site_id=eq.1d5d6f99-72cc-4335-946d-13ff8f0b0419
```

---

## ✅ Solution Already Applied

### 1. Database Migration (20250220000019)

- ✅ Added `clock_in_date` column to `attendance_logs`
- ✅ Created trigger to auto-populate `clock_in_date`
- ✅ Created helper functions in `src/lib/attendance-logs.ts`

### 2. Helper Functions Created

- ✅ `isUserClockedInToday()` - Uses `clock_in_date` column
- ✅ `getAttendanceLogForDate()` - Uses `clock_in_date` column
- ✅ `getActiveAttendanceLogsForSite()` - Uses `clock_in_date` column

---

## 🔍 Current Investigation

### Codebase Search Results:

- ✅ **No occurrences found** of `clock_in_at::date` in source code
- ✅ **No occurrences found** of `attendance_logs` with date filters in TypeScript
- ✅ Attendance service uses `staff_attendance` table (different table)

### Possible Sources:

1. **Browser Cache / Old Code**
   - Cached JavaScript files still using old query pattern
   - Solution: Hard refresh browser (Ctrl+Shift+R) or clear cache

2. **Database Function / Trigger**
   - PostgreSQL function making REST API calls
   - Solution: Check Supabase functions/triggers

3. **Browser Extension / Dev Tool**
   - Extension intercepting and modifying queries
   - Solution: Disable extensions and test

4. **Service Worker / PWA Cache**
   - Cached service worker making old queries
   - Solution: Unregister service worker or clear PWA cache

5. **Supabase Real-time Subscription**
   - Realtime subscription filter using old pattern
   - Solution: Check realtime subscriptions

---

## 🎯 Action Items

### Immediate Steps:

1. **Check Browser DevTools Network Tab**
   - Open DevTools → Network tab
   - Filter by `attendance_logs`
   - Find the failing request
   - Check "Initiator" or "Call Stack" to see what triggered it

2. **Clear Browser Cache**

   ```javascript
   // In browser console:
   // Clear cache and hard reload
   location.reload(true);

   // Or clear service worker
   navigator.serviceWorker.getRegistrations().then((registrations) => {
     registrations.forEach((reg) => reg.unregister());
   });
   ```

3. **Check Supabase Logs**
   - Supabase Dashboard → Logs → API Logs
   - Filter by `attendance_logs`
   - Check what client/user is making the query

4. **Search for Hidden Code**

   ```bash
   # Search for URL-encoded version
   grep -r "clock_in_at%3A%3Adate" src/
   grep -r "clock_in_at::date" src/
   grep -r "attendance_logs.*select.*id" src/
   ```

5. **Check Database Functions**
   ```sql
   -- In Supabase SQL Editor, check for functions using attendance_logs
   SELECT routine_name, routine_definition
   FROM information_schema.routines
   WHERE routine_definition LIKE '%attendance_logs%'
     AND routine_definition LIKE '%clock_in_at%';
   ```

---

## 📝 Correct Query Pattern

### ❌ DON'T USE (Causes 406):

```typescript
// This causes 406 error
supabase.from("attendance_logs").select("id").eq("clock_in_at::date", "2025-11-18"); // ❌ Not supported
```

### ✅ DO USE:

```typescript
// Use clock_in_date column
import { isUserClockedInToday } from "@/lib/attendance-logs";

const isClockedIn = await isUserClockedInToday(userId, siteId, "2025-11-18");
```

Or direct query:

```typescript
supabase
  .from("attendance_logs")
  .select("id")
  .eq("clock_in_date", "2025-11-18") // ✅ Works!
  .eq("site_id", siteId);
```

---

## 🔧 Temporary Workaround

If you can't find the source immediately, you can:

1. **Add error handling** to suppress 406 errors:

```typescript
// In your error handler
if (error.code === "PGRST116" || error.message.includes("406")) {
  // Handle gracefully - this is expected if old code still runs
  console.warn("Ignoring 406 error from old attendance_logs query pattern");
  return null;
}
```

2. **Use RPC function** instead:

```typescript
// RPC functions work regardless of column names
const { data } = await supabase.rpc("is_user_clocked_in_today", {
  p_user_id: userId,
  p_site_id: siteId,
  p_date: "2025-11-18",
});
```

---

## 📚 Related Files

- `supabase/migrations/20250220000019_fix_attendance_logs_rest_api_query.sql`
- `src/lib/attendance-logs.ts` - Helper functions (correct implementation)
- `ATTENDANCE_LOGS_406_ERROR_FIX.md` - Previous fix documentation
- `FIX_406_ERROR_COMPLETE.md` - Completion notes

---

## 🎯 Next Steps

1. ✅ **Find the source** of the query using DevTools Network tab
2. ✅ **Update or remove** the code making the old query
3. ✅ **Verify migration applied** - Check `clock_in_date` column exists
4. ✅ **Test** - Confirm no more 406 errors

---

**Status:** 🔍 **NEEDS INVESTIGATION** - Source of query not found in codebase
