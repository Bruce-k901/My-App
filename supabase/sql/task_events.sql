-- Task events audit log and RLS

CREATE TABLE IF NOT EXISTS public.task_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  site_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL, -- e.g., status_change, notes_update, photo_upload
  details jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_events_task ON public.task_events (task_id);
CREATE INDEX IF NOT EXISTS idx_task_events_site ON public.task_events (site_id);
CREATE INDEX IF NOT EXISTS idx_task_events_created ON public.task_events (created_at DESC);

ALTER TABLE public.task_events ENABLE ROW LEVEL SECURITY;

-- Read within company
CREATE POLICY task_events_select_company
  ON public.task_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = task_events.company_id
    )
  );

-- Insert within company by the acting user
CREATE POLICY task_events_insert_company
  ON public.task_events
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = task_events.company_id
    )
    AND task_events.user_id = auth.uid()
  );

-- No updates/deletes for normal users (omit policies). Service role bypasses RLS.