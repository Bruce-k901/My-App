-- Migration: Add unique constraint to prevent duplicate tasks
-- Description: Prevents duplicate tasks from being created with the same
-- template_id, site_id, due_date, daypart, and due_time combination
-- This prevents race conditions in task generation
-- Note: This migration will be skipped if checklist_tasks table doesn't exist yet

-- First, remove existing duplicates before adding the constraint
-- Keep only the oldest task (by created_at) for each duplicate group
-- Only proceed if checklist_tasks table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checklist_tasks') THEN
    -- Remove duplicates
    WITH duplicates AS (
      SELECT 
        id,
        ROW_NUMBER() OVER (
          PARTITION BY template_id, site_id, due_date, COALESCE(daypart, ''), COALESCE(due_time::text, '') 
          ORDER BY created_at ASC
        ) as rn
      FROM checklist_tasks
      WHERE template_id IS NOT NULL
    )
    DELETE FROM checklist_tasks
    WHERE id IN (
      SELECT id FROM duplicates WHERE rn > 1
    );

    -- Add unique constraint to prevent future duplicates
    -- This constraint ensures that for template-based tasks, we can't have
    -- multiple tasks with the same template_id, site_id, due_date, daypart, and due_time
    CREATE UNIQUE INDEX IF NOT EXISTS idx_checklist_tasks_unique_template_task
    ON checklist_tasks (template_id, site_id, due_date, COALESCE(daypart, ''), COALESCE(due_time::text, ''))
    WHERE template_id IS NOT NULL;

    -- Add comment (only if index exists)
    IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_checklist_tasks_unique_template_task') THEN
      COMMENT ON INDEX idx_checklist_tasks_unique_template_task IS 
      'Prevents duplicate tasks from being created with the same template, site, date, daypart, and time combination';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ checklist_tasks table does not exist yet - skipping unique constraint migration';
  END IF;
END $$;

