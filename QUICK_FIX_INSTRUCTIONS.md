# Quick Fix Instructions for Deadlock

## The Problem

You have an active connection (likely from Supabase dashboard) that's holding a lock on `staff_attendance` table. This prevents the fix script from running.

## Solution: 3 Simple Steps

### Step 1: Close Supabase Dashboard Tabs

1. Close **ALL** tabs in your browser that have Supabase dashboard open
2. This includes:
   - Table Editor tabs viewing `staff_attendance` or `attendance_logs`
   - SQL Editor tabs
   - Any other Supabase dashboard pages

### Step 2: Wait 10 Seconds

Wait for any active queries to finish (the lock you saw has a 58s timeout, but usually finishes in 5-10 seconds)

### Step 3: Run the Fix Script

Run `FIX_ATTENDANCE_WITH_LOCKS.sql` in Supabase SQL Editor

## If It Still Doesn't Work

### Option A: Wait Longer

1. Wait 1-2 minutes for all queries to finish
2. Run `CHECK_ACTIVE_CONNECTIONS.sql` again to verify no locks remain
3. Run `FIX_ATTENDANCE_WITH_LOCKS.sql`

### Option B: Use the Safe Script

Run `SAFE_FIX_ATTENDANCE.sql` instead - it handles locks more gracefully

### Option C: Disable Triggers Manually

If you can't drop triggers due to locks, you can at least disable them:

```sql
-- Disable all triggers on staff_attendance
ALTER TABLE public.staff_attendance DISABLE TRIGGER ALL;
```

This will stop the sync from happening, even if you can't drop the triggers yet. You can drop them later when there are no active connections.

## Why This Happens

Supabase dashboard automatically queries table schemas when you view them. These queries hold read locks that prevent DDL operations (like dropping triggers/views).

## After the Fix

1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh your app (Ctrl+Shift+R)
3. Try clocking in again
