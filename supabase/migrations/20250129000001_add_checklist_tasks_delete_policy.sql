-- Add DELETE policy for checklist_tasks
-- This allows users to delete task instances they have access to

-- Policy: Users can delete tasks for their company
DROP POLICY IF EXISTS "Users can delete tasks for their company" ON public.checklist_tasks;
CREATE POLICY "Users can delete tasks for their company"
  ON public.checklist_tasks FOR DELETE
  USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- Grant DELETE permission (should already be granted, but ensuring it's there)
GRANT DELETE ON public.checklist_tasks TO authenticated;

COMMENT ON POLICY "Users can delete tasks for their company" ON public.checklist_tasks IS 
'Allows authenticated users to delete task instances (checklist_tasks) that belong to their company. This enables cleanup of duplicate or unwanted task instances.';




