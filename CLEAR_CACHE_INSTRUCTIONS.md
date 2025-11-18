# Clear Cache Instructions - attendance_logs 404 Error

## Problem

You're seeing 404 errors for `attendance_logs` table queries. This is because:

1. The `attendance_logs` table has been removed (migrated to `staff_attendance`)
2. Your browser or Next.js has cached old JavaScript that still queries the old table

## Solution - Complete Cache Clear

### Step 1: Clear Browser Cache (CRITICAL)

**Chrome/Edge:**

1. Press `F12` to open DevTools
2. Right-click the refresh button (while DevTools is open)
3. Select "Empty Cache and Hard Reload"
4. OR: Press `Ctrl+Shift+Delete` → Select "Cached images and files" → "All time" → Clear

**Firefox:**

1. Press `Ctrl+Shift+Delete`
2. Select "Everything" for time range
3. Check "Cache"
4. Click "Clear Now"

**Safari:**

1. Press `Cmd+Option+E` (Mac)
2. OR: Safari menu → Preferences → Advanced → Check "Show Develop menu" → Develop → Empty Caches

### Step 2: Clear Next.js Build Cache

```bash
# Delete .next folder
rm -rf .next

# Or on Windows PowerShell:
Remove-Item -Path .next -Recurse -Force
```

### Step 3: Restart Dev Server

```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 4: Clear Service Workers (if applicable)

1. Open DevTools (F12)
2. Go to "Application" tab
3. Click "Service Workers" in left sidebar
4. Click "Unregister" for any service workers
5. Go to "Storage" tab → Click "Clear site data"

### Step 5: Verify Fix

1. Open browser DevTools → Network tab
2. Filter by "attendance_logs"
3. Reload the page
4. You should see **no requests** to `attendance_logs`
5. Any attendance queries should go to `staff_attendance` instead

## Still Seeing Errors?

1. **Check Console**: Look for the exact file/line making the query
2. **Search Codebase**: `grep -r "attendance_logs" src/` (should return no results)
3. **Check Node Modules**: Sometimes cached in `node_modules/.cache` - try `rm -rf node_modules/.cache`
4. **Incognito Mode**: Test in incognito/private window (no cache)

## What Changed

- **Old Table**: `attendance_logs` (removed)
- **New Table**: `staff_attendance` (use this)
- **Old Column**: `clock_in_at` → **New Column**: `clock_in_time`
- **Old Column**: `clock_out_at` → **New Column**: `clock_out_time`

## Code References

✅ **Use these**:

- `@/lib/notifications/attendance` (recommended)
- `@/hooks/useAttendance` (React hook)

❌ **Don't use**:

- `@/lib/attendance-logs` (deprecated, still exists but only for legacy compatibility)
