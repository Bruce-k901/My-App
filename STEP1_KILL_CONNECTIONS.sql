-- STEP 1: Kill all active connections to the database (run this first)
-- This will terminate any connections that might be blocking the schema changes

SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
  AND state = 'active';

-- Wait 5 seconds, then run STEP 2 below
