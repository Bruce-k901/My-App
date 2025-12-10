# Auto Clock-Out Diagnosis & Fix

## Issue

Auto clockout for team members is not working.

## Root Causes Identified

### 1. **Missing Cron Job**

The function `auto_clock_out_after_closing()` exists but may not be scheduled properly. The cron job needs to be verified.

### 2. **Function Logic Issues**

The original function has several potential failure points:

- **Null/Empty Closing Times**: If a site's operating schedule has null or empty `hh`/`mm` values, the function will skip that user
- **Missing Site Schedule**: If a site has no `operating_schedule`, users won't be auto clocked out
- **Inactive Days**: If someone clocked in on a day that's marked inactive in the schedule, they won't be auto clocked out
- **No Fallback**: There's no fallback mechanism for users who should be clocked out but don't meet the "2 hours after closing" criteria

### 3. **24-Hour Fallback Missing**

There's a separate function `auto_clock_out_old_shifts()` that clocks out shifts older than 24 hours, but it's not scheduled via cron.

## Solution

I've created an improved version of the auto clock-out function (`FIX_AUTO_CLOCKOUT.sql`) that:

1. **Adds 24-Hour Fallback**: If a user can't be clocked out based on site closing time (due to missing schedule, inactive day, etc.), they'll be auto clocked out after 24 hours
2. **Better Error Handling**: Handles null/empty values gracefully
3. **Ensures Cron Job**: Recreates the cron job to ensure it's scheduled
4. **Returns Reason**: The function now returns a `reason` field explaining why each user was clocked out

## How to Fix

### Step 1: Run the Diagnostic Script

First, run `CHECK_AUTO_CLOCKOUT_STATUS.sql` in your Supabase SQL Editor to see the current state:

```sql
-- This will show:
-- 1. If cron job exists
-- 2. Recent execution history
-- 3. Users who should be clocked out
-- 4. Function status
```

### Step 2: Apply the Fix

Run `FIX_AUTO_CLOCKOUT.sql` in your Supabase SQL Editor. This will:

- Update the function with improved logic
- Ensure the cron job is scheduled
- Grant necessary permissions

### Step 3: Test Manually

Test the function to see if it works:

```sql
-- Run the function manually
SELECT * FROM auto_clock_out_after_closing();
```

This will show you which users were clocked out and why.

### Step 4: Verify Cron Job

Check that the cron job is scheduled and running:

```sql
-- Check cron job exists
SELECT * FROM cron.job WHERE jobname = 'auto-clock-out-after-closing';

-- Check recent executions
SELECT * FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-clock-out-after-closing')
ORDER BY start_time DESC
LIMIT 10;
```

## Expected Behavior After Fix

1. **Every Hour**: The cron job runs at the top of every hour (e.g., 1:00 PM, 2:00 PM, etc.)
2. **2 Hours After Closing**: Users are auto clocked out 2 hours after their site's closing time
3. **24-Hour Fallback**: If site schedule is missing/invalid, users are clocked out after 24 hours
4. **Graceful Handling**: All edge cases are handled (null values, missing schedules, etc.)

## Monitoring

After applying the fix, monitor these queries:

### Check Currently Clocked In Users

```sql
SELECT
  sa.id,
  p.full_name,
  s.name AS site_name,
  sa.clock_in_time,
  NOW() - sa.clock_in_time AS time_clocked_in,
  EXTRACT(EPOCH FROM (NOW() - sa.clock_in_time)) / 3600.0 AS hours_clocked_in
FROM staff_attendance sa
JOIN profiles p ON p.id = sa.user_id
LEFT JOIN sites s ON s.id = p.site_id
WHERE sa.clock_out_time IS NULL
  AND sa.shift_status = 'on_shift'
ORDER BY sa.clock_in_time ASC;
```

### Check Recent Auto Clockouts

```sql
SELECT
  sa.id,
  p.full_name,
  sa.clock_in_time,
  sa.clock_out_time,
  sa.shift_notes,
  sa.total_hours
FROM staff_attendance sa
JOIN profiles p ON p.id = sa.user_id
WHERE sa.shift_notes LIKE '%Auto clocked out%'
ORDER BY sa.clock_out_time DESC
LIMIT 20;
```

## Troubleshooting

### If cron job still doesn't run:

1. **Check pg_cron extension**: Ensure `pg_cron` is enabled in your Supabase project
2. **Check permissions**: The function needs `SECURITY DEFINER` and proper grants
3. **Manual trigger**: You can manually trigger the function until cron is fixed

### If users still aren't being clocked out:

1. **Check site schedules**: Ensure sites have valid `operating_schedule` data
2. **Check user home sites**: Users need a `site_id` in their profile
3. **Check clock-in times**: The function checks against the day the user clocked in

### If you see errors in cron logs:

Check the `cron.job_run_details` table for error messages:

```sql
SELECT
  start_time,
  end_time,
  status,
  return_message
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-clock-out-after-closing')
ORDER BY start_time DESC
LIMIT 5;
```

## Notes

- The function runs every hour, so there may be up to a 1-hour delay before users are clocked out
- Users are clocked out at the calculated time (2 hours after closing), not at the current time
- The 24-hour fallback ensures no one stays clocked in indefinitely, even if site schedules are missing
