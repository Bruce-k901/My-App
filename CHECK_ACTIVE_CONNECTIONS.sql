-- ============================================================================
-- CHECK ACTIVE CONNECTIONS
-- Run this FIRST to see what's blocking the fix
-- ============================================================================

-- Show all active queries related to attendance
SELECT 
  pid,
  usename,
  application_name,
  state,
  LEFT(query, 100) as query_preview,
  query_start,
  state_change
FROM pg_stat_activity
WHERE (
  query ILIKE '%attendance_logs%'
  OR query ILIKE '%staff_attendance%'
  OR query ILIKE '%sync%attendance%'
)
AND pid != pg_backend_pid()  -- Exclude this query itself
ORDER BY query_start;

-- If you see active queries, you can cancel them with:
-- SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = <pid_from_above>;

-- Show locks on attendance tables
SELECT 
  l.locktype,
  l.database,
  l.relation::regclass,
  l.page,
  l.tuple,
  l.virtualxid,
  l.transactionid,
  l.mode,
  l.granted,
  a.usename,
  a.query,
  a.query_start,
  age(now(), a.query_start) AS "age"
FROM pg_locks l
LEFT JOIN pg_stat_activity a ON l.pid = a.pid
WHERE (
  l.relation::regclass::text ILIKE '%attendance%'
  OR a.query ILIKE '%attendance%'
)
AND l.pid != pg_backend_pid()
ORDER BY a.query_start;

