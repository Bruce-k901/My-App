# Troubleshooting: attendance_logs 404 Errors

## Problem

You're seeing 404 errors when trying to query `attendance_logs`:

```
GET .../attendance_logs?select=id&clock_in_at::date=eq.2025-11-18... 404 (Not Found)
```

## Cause

The `attendance_logs` table has been removed and replaced with `staff_attendance`. The error is caused by **cached JavaScript** in your browser or Next.js build cache.

## Solution

### 1. Clear Browser Cache

- **Chrome/Edge**: Press `Ctrl+Shift+Delete` → Select "Cached images and files" → Clear
- **Or**: Hard refresh with `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

### 2. Clear Next.js Build Cache

```bash
# Delete .next folder
rm -rf .next

# Or on Windows PowerShell:
Remove-Item -Path .next -Recurse -Force

# Then restart dev server
npm run dev
```

### 3. Restart Dev Server

```bash
# Stop the current dev server (Ctrl+C)
# Then restart
npm run dev
```

### 4. Verify Migration Applied

Check in Supabase Dashboard → SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'attendance_logs';
```

This should return **no rows** (table doesn't exist).

## What Changed

- **Old Table**: `attendance_logs` (removed)
- **New Table**: `staff_attendance` (use this instead)
- **Old Field**: `clock_in_at` → **New Field**: `clock_in_time`
- **Old Field**: `clock_out_at` → **New Field**: `clock_out_time`

## Code References

All attendance queries now use:

- `@/lib/notifications/attendance` (recommended)
- `@/hooks/useAttendance` (React hook)

Do **NOT** use:

- `@/lib/attendance-logs` (legacy, may still exist but deprecated)

## Still Seeing Errors?

1. Check browser DevTools → Network tab → Find the failing request
2. Check the stack trace in Console to see which file is making the request
3. Search your codebase: `grep -r "attendance_logs" src/`
4. If found, update to use `staff_attendance` instead
