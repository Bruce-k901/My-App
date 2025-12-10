-- ============================================================================
-- Diagnostic Script: Check Auto Clock-Out Status
-- ============================================================================
-- This script checks:
-- 1. If the cron job exists and is scheduled
-- 2. If the function exists
-- 3. Recent cron job execution history
-- 4. Users who should be auto clocked out
-- 5. Test the function manually
-- ============================================================================

-- 1. Check if cron job exists
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active,
  jobname
FROM cron.job 
WHERE jobname = 'auto-clock-out-after-closing';

-- 2. Check if function exists
SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'auto_clock_out_after_closing';

-- 3. Check recent cron job execution history (last 10 runs)
SELECT 
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-clock-out-after-closing')
ORDER BY start_time DESC
LIMIT 10;

-- 4. Check users who are currently clocked in and should be auto clocked out
-- (clocked in, no clock out time, 2+ hours after their site's closing time)
WITH clocked_in_users AS (
  SELECT 
    sa.id,
    sa.user_id,
    sa.site_id,
    sa.clock_in_time,
    p.full_name,
    p.site_id AS home_site_id,
    s.name AS site_name,
    s.operating_schedule
  FROM public.staff_attendance sa
  JOIN public.profiles p ON p.id = sa.user_id
  LEFT JOIN public.sites s ON s.id = p.site_id
  WHERE sa.clock_out_time IS NULL
    AND sa.shift_status = 'on_shift'
    AND p.site_id IS NOT NULL
)
SELECT 
  cui.id,
  cui.user_id,
  cui.full_name,
  cui.site_name,
  cui.clock_in_time,
  NOW() AS current_time,
  CASE 
    WHEN cui.operating_schedule IS NULL THEN 'No operating schedule'
    WHEN (cui.operating_schedule->>EXTRACT(DOW FROM cui.clock_in_time)::text) IS NULL THEN 'Day not in schedule'
    ELSE 'Has schedule'
  END AS schedule_status,
  cui.operating_schedule
FROM clocked_in_users cui
ORDER BY cui.clock_in_time DESC;

-- 5. Test the function manually (this will actually run it)
-- Uncomment the line below to test:
-- SELECT * FROM auto_clock_out_after_closing();

-- 6. Check if pg_cron extension is enabled
SELECT 
  extname,
  extversion
FROM pg_extension
WHERE extname = 'pg_cron';

-- 7. Check for users who have been clocked in for more than 24 hours
-- (should be caught by auto_clock_out_old_shifts if it's scheduled)
SELECT 
  sa.id,
  p.full_name,
  s.name AS site_name,
  sa.clock_in_time,
  NOW() - sa.clock_in_time AS time_clocked_in,
  EXTRACT(EPOCH FROM (NOW() - sa.clock_in_time)) / 3600.0 AS hours_clocked_in
FROM public.staff_attendance sa
JOIN public.profiles p ON p.id = sa.user_id
LEFT JOIN public.sites s ON s.id = sa.site_id
WHERE sa.clock_out_time IS NULL
  AND sa.shift_status = 'on_shift'
  AND sa.clock_in_time < NOW() - INTERVAL '24 hours'
ORDER BY sa.clock_in_time ASC;

-- 8. Check if auto_clock_out_old_shifts function exists and if it's scheduled
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'auto_clock_out_old_shifts';

-- Check if there's a cron job for auto_clock_out_old_shifts
SELECT 
  jobid,
  schedule,
  command,
  jobname,
  active
FROM cron.job 
WHERE jobname LIKE '%clock%out%' OR command LIKE '%clock%out%';

