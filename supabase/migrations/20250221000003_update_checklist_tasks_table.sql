-- ============================================================================
-- STEP 3: UPDATE CHECKLIST_TASKS TABLE
-- ============================================================================

-- Add link to site_checklists
ALTER TABLE checklist_tasks 
ADD COLUMN IF NOT EXISTS site_checklist_id UUID REFERENCES site_checklists(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_checklist_tasks_site_checklist 
ON checklist_tasks(site_checklist_id);

-- RLS Policies for checklist_tasks
ALTER TABLE checklist_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view tasks for their site or all if Owner/Admin" ON checklist_tasks;
DROP POLICY IF EXISTS "Service role can insert tasks" ON checklist_tasks;
DROP POLICY IF EXISTS "Users update tasks for their site" ON checklist_tasks;

CREATE POLICY "Users view tasks for their site or all if Owner/Admin"
ON checklist_tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND (
      profiles.app_role IN ('Owner', 'Admin')
      OR profiles.site_id = checklist_tasks.site_id
    )
  )
);

CREATE POLICY "Service role can insert tasks"
ON checklist_tasks FOR INSERT
WITH CHECK (true); -- Edge Function uses service role

CREATE POLICY "Users update tasks for their site"
ON checklist_tasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.site_id = checklist_tasks.site_id
  )
);

