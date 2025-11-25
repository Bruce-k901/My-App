-- Add archive functionality to tasks table

-- Add archive columns
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for archived tasks
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON public.tasks(archived);
CREATE INDEX IF NOT EXISTS idx_tasks_archived_at ON public.tasks(archived_at DESC);

-- Function to auto-archive completed tasks after 30 days
CREATE OR REPLACE FUNCTION auto_archive_old_completed_tasks()
RETURNS void AS $$
BEGIN
  UPDATE public.tasks
  SET 
    archived = true,
    archived_at = now()
  WHERE 
    status IN ('completed', 'done', 'cancelled')
    AND archived = false
    AND completed_at < (now() - interval '30 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- You can manually run this function or set up a cron job:
-- SELECT cron.schedule('auto-archive-tasks', '0 2 * * *', 'SELECT auto_archive_old_completed_tasks()');

-- Reload schema
NOTIFY pgrst, 'reload schema';
