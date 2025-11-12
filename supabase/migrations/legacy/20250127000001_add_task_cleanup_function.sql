-- Migration: Add cleanup function for old task records
-- Description: Automatically delete task_completion_records and completed checklist_tasks older than 12 months
-- Author: Checkly Development Team
-- Date: 2025-01-27

-- ============================================================================
-- CLEANUP FUNCTION FOR OLD TASK RECORDS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_task_records()
RETURNS TABLE (
  deleted_completion_records INTEGER,
  deleted_tasks INTEGER
) AS $$
DECLARE
  completion_count INTEGER;
  task_count INTEGER;
BEGIN
  -- Delete completion records older than 12 months and capture count
  WITH deleted AS (
    DELETE FROM public.task_completion_records
    WHERE completed_at < NOW() - INTERVAL '12 months'
    RETURNING id
  )
  SELECT COUNT(*) INTO completion_count FROM deleted;

  -- Delete completed tasks older than 12 months and capture count
  WITH deleted AS (
    DELETE FROM public.checklist_tasks
    WHERE status = 'completed'
      AND completed_at IS NOT NULL
      AND completed_at < NOW() - INTERVAL '12 months'
    RETURNING id
  )
  SELECT COUNT(*) INTO task_count FROM deleted;

  RETURN QUERY SELECT completion_count, task_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (admins will call this)
GRANT EXECUTE ON FUNCTION public.cleanup_old_task_records() TO authenticated;

COMMENT ON FUNCTION public.cleanup_old_task_records() IS 
  'Deletes task_completion_records and completed checklist_tasks older than 12 months. Returns counts of deleted records.';

-- ============================================================================
-- OPTIONAL: SET UP PG_CRON SCHEDULE (Requires pg_cron extension)
-- ============================================================================

-- Uncomment below if you have pg_cron extension installed
-- SELECT cron.schedule(
--   'cleanup-old-task-records-daily',           -- job name
--   '0 2 * * *',                                -- run at 2 AM daily
--   $$SELECT public.cleanup_old_task_records()$$
-- );

COMMENT ON FUNCTION public.cleanup_old_task_records() IS 
  'Deletes task_completion_records and completed checklist_tasks older than 12 months. Returns counts of deleted records. Can be scheduled with pg_cron or called manually via Edge Function.';

