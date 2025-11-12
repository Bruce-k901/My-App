-- Migration: Add custom name and instructions to checklist_tasks
-- Description: Allows tasks to have custom names (e.g., "Front counter setup checklist") beyond template name
-- Date: 2025-02-01

ALTER TABLE public.checklist_tasks
ADD COLUMN IF NOT EXISTS custom_name TEXT,
ADD COLUMN IF NOT EXISTS custom_instructions TEXT;

-- Add comment to explain these fields
COMMENT ON COLUMN public.checklist_tasks.custom_name IS 'Custom name for this task instance, if different from template name (e.g., "Front counter setup checklist" vs template "Checklist Template")';
COMMENT ON COLUMN public.checklist_tasks.custom_instructions IS 'Custom instructions for this task instance, if different from template instructions';








