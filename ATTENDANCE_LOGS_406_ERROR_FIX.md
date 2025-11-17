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

1. **Apply Migration 20250220000017** in Supabase SQL Editor
2. **Find what's making the query** - Check browser Network tab or Supabase logs to see what's calling this
3. **Update the query** to use `clock_in_date` instead of `clock_in_at::date`

## Finding the Source

The query is likely coming from:

- A notification system function
- A task filtering system
- Some background process checking who's clocked in

To find it:

1. Open browser DevTools → Network tab
2. Look for the failing request
3. Check the "Initiator" column to see what code made the request
4. Or check Supabase Dashboard → Logs → API Logs

## Temporary Workaround

If you can't find/fix the source immediately, the RLS policies should at least allow the query to fail gracefully instead of 406. The migration includes proper RLS setup.

## RPC Functions Available

If you need to query by date programmatically, use these RPC functions:

- `get_attendance_logs_by_date(p_site_id, p_date, p_user_id)`
- `is_user_clocked_in_today(p_user_id, p_site_id, p_date)`
- `get_active_attendance_logs(p_site_id, p_date)`

These work via REST API: `POST /rest/v1/rpc/function_name`
