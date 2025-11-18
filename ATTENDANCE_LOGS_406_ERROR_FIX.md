# Fix attendance_logs 406 Error

## Problem

Getting 406 (Not Acceptable) errors from queries like:

```
GET /rest/v1/attendance_logs?select=id&clock_in_at::date=eq.2025-11-17&site_id=eq.xxx
```

## Root Cause

Supabase REST API (PostgREST) doesn't support PostgreSQL casting operators (`::date`) in URL filter parameters.

## Solution Applied

### Migration 20250220000017

Adds a `clock_in_date` DATE column that's automatically populated via trigger. This allows REST API queries to filter by date without using `::date` casting.

**After applying the migration, queries should use:**

- ✅ `clock_in_date=eq.2025-11-17` (works)
- ❌ `clock_in_at::date=eq.2025-11-17` (doesn't work)

## What to Do

1. **Apply Migration 20250220000019** in Supabase SQL Editor (this ensures everything is set up correctly)
2. **Find what's making the query** - Check browser Network tab or Supabase logs to see what's calling this
3. **Update the query** to use `clock_in_date` instead of `clock_in_at::date`
4. **Use the helper functions** in `src/lib/attendance-logs.ts` for client-side queries

## Finding the Source

Based on the error URL you provided:

```
GET /rest/v1/attendance_logs?select=id&user_id=eq.8066c4f2-fbff-4255-be96-71acf151473d&clock_out_at=is.null&clock_in_at%3A%3Adate=eq.2025-11-17&site_id=eq.1d5d6f99-72cc-4335-946d-13ff8f0b0419
```

This query checks if a user is clocked in today at a specific site. The source could be:

- A database function/trigger querying attendance_logs
- Some cached frontend code
- A browser extension or dev tool
- A Supabase realtime subscription filter

**To find it:**

1. Open browser DevTools → Network tab
2. Look for the failing request to `attendance_logs`
3. Check the "Initiator" or "Call Stack" to see what code triggered it
4. Or check Supabase Dashboard → Logs → API Logs → filter by `attendance_logs`

**If you can't find the source:**
The migrations below will add a `clock_in_date` column. Once applied, search your codebase for any code using `clock_in_at::date` or `clock_in_at%3A%3Adate` and update it to use `clock_in_date`.

## Temporary Workaround

If you can't find/fix the source immediately, the RLS policies should at least allow the query to fail gracefully instead of 406. The migration includes proper RLS setup.

## RPC Functions Available

If you need to query by date programmatically, use these RPC functions:

- `get_attendance_logs_by_date(p_site_id, p_date, p_user_id)`
- `is_user_clocked_in_today(p_user_id, p_site_id, p_date)`
- `get_active_attendance_logs(p_site_id, p_date)`

These work via REST API: `POST /rest/v1/rpc/function_name`
