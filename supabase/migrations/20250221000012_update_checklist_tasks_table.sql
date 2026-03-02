-- ============================================================================
-- STEP 3: UPDATE CHECKLIST_TASKS TABLE
-- ============================================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if checklist_tasks table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checklist_tasks') THEN

    -- Add link to site_checklists if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'site_checklists') THEN
      ALTER TABLE checklist_tasks 
      ADD COLUMN IF NOT EXISTS site_checklist_id UUID;

      -- Add foreign key constraint if column doesn't have it
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
        AND table_name = 'checklist_tasks' 
        AND constraint_name LIKE '%site_checklist%'
      ) THEN
        ALTER TABLE checklist_tasks 
        ADD CONSTRAINT checklist_tasks_site_checklist_id_fkey 
        FOREIGN KEY (site_checklist_id) REFERENCES site_checklists(id) ON DELETE SET NULL;
      END IF;

      CREATE INDEX IF NOT EXISTS idx_checklist_tasks_site_checklist 
      ON checklist_tasks(site_checklist_id);
    END IF;

    -- RLS Policies for checklist_tasks
    ALTER TABLE checklist_tasks ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users view tasks for their site or all if Owner/Admin" ON checklist_tasks;
    DROP POLICY IF EXISTS "Service role can insert tasks" ON checklist_tasks;
    DROP POLICY IF EXISTS "Users update tasks for their site" ON checklist_tasks;

    -- Only create policies if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
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
    END IF;

    RAISE NOTICE 'Updated checklist_tasks table';

  ELSE
    RAISE NOTICE '⚠️ checklist_tasks table does not exist yet - skipping updates';
  END IF;
END $$;

