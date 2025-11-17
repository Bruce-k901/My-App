# Quick Fix for 406 Error

## The Problem

You're getting a 406 error because something is querying:

```
/rest/v1/attendance_logs?clock_in_at::date=eq.2025-11-17
```

PostgREST doesn't support `::date` casting in URL filters.

## Immediate Fix (2 Steps)

### Step 1: Apply Migration 17

Go to Supabase Dashboard → SQL Editor → Run migration `20250220000017_add_date_column_via_trigger.sql`

This adds a `clock_in_date` column that can be used instead.

### Step 2: Find and Fix the Source

**Option A: Check Browser DevTools**

1. Open DevTools (F12)
2. Go to Network tab
3. Find the failing request to `attendance_logs`
4. Click on it → Check "Initiator" tab
5. This will show you what code made the request

**Option B: Search Your Codebase**
Search for these patterns:

- `clock_in_at::date`
- `clock_in_at%3A%3Adate` (URL encoded)
- Any code manually constructing query strings with `attendance_logs`

**Option C: Check Database Functions**
The query might be coming from a database function. Check Supabase Dashboard → Database → Functions for any functions that query `attendance_logs`.

## Once You Find It

Update the query from:

```javascript
// ❌ This doesn't work
.from('attendance_logs')
.select('id')
.eq('clock_in_at::date', '2025-11-17')  // or similar
```

To:

```javascript
// ✅ This works
.from('attendance_logs')
.select('id')
.eq('clock_in_date', '2025-11-17')
```

## Alternative: Use RPC Function

If you can't find/fix the source, use the RPC function instead:

```javascript
const { data } = await supabase.rpc("is_user_clocked_in_today", {
  p_user_id: userId,
  p_site_id: siteId,
  p_date: "2025-11-17",
});
```

This function is created in migration 16.
