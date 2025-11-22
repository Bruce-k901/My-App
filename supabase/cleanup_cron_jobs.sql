-- 1. CLEANUP: Attempt to remove old jobs one by one (ignore errors if they don't exist)
DO $$
BEGIN
    -- Wrap each unschedule in its own block to prevent one failure from stopping the script
    BEGIN PERFORM cron.unschedule('generate-daily-tasks-edge'); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN PERFORM cron.unschedule('generate-daily-tasks-edge-function'); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN PERFORM cron.unschedule('mark-overdue-tasks-hourly'); EXCEPTION WHEN OTHERS THEN NULL; END;
    BEGIN PERFORM cron.unschedule('generate-daily-tasks-v2'); EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;

-- 2. VERIFY CLEANUP
-- Run this just to see what's left. If the above worked, the conflicting ones should be gone.
SELECT * FROM cron.job;

