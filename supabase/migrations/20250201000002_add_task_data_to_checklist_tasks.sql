-- Migration: Add task_data JSONB field to checklist_tasks
-- Description: Stores instance-specific task data like checklist items, temperatures, etc.
-- This is separate from completion_data which is stored in task_completion_records

ALTER TABLE public.checklist_tasks
ADD COLUMN IF NOT EXISTS task_data JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.checklist_tasks.task_data IS 'Instance-specific task data (checklist items, temperature logs, etc.) stored when task is created. Separate from completion_data which is stored in task_completion_records.';

-- Add index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_task_data ON public.checklist_tasks USING GIN (task_data);




