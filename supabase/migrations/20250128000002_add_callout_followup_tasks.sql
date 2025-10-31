-- Add callout_id to checklist_tasks for callout follow-up tasks
ALTER TABLE public.checklist_tasks
ADD COLUMN IF NOT EXISTS callout_id UUID REFERENCES public.callouts(id) ON DELETE SET NULL;

-- Make template_id nullable for callout follow-up tasks (which don't need a template)
ALTER TABLE public.checklist_tasks
ALTER COLUMN template_id DROP NOT NULL;

-- Create index for callout follow-up tasks
CREATE INDEX IF NOT EXISTS idx_checklist_tasks_callout_id ON public.checklist_tasks(callout_id);

-- Add constraint: either template_id or callout_id must be present
ALTER TABLE public.checklist_tasks
ADD CONSTRAINT checklist_tasks_template_or_callout_check 
CHECK (template_id IS NOT NULL OR callout_id IS NOT NULL);

-- Add flag_reason for callout follow-up
-- (Already supports custom flag_reason, but documenting this use case)
COMMENT ON COLUMN public.checklist_tasks.callout_id IS 'Reference to callout for follow-up tasks';
COMMENT ON COLUMN public.checklist_tasks.flag_reason IS 'Reason for flagging: monitoring, completed_late, completed_early, callout_followup';
COMMENT ON COLUMN public.checklist_tasks.template_id IS 'Reference to task template. NULL for callout follow-up tasks.';

