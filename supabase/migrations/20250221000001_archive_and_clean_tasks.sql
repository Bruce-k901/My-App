-- ============================================================================
-- STEP 1: ARCHIVE TEMPLATES & CLEAN EVERYTHING
-- Note: This migration will be skipped if task_templates table doesn't exist yet
-- ============================================================================

-- 1.1: Create archive table (only if task_templates exists)
DO $$
DECLARE
  archive_count INTEGER;
  library_count INTEGER;
  custom_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    CREATE TABLE IF NOT EXISTS task_templates_archive (
      LIKE task_templates INCLUDING ALL
    );

    -- 1.2: Backup ALL templates (only if archive table was just created or is empty)
    -- Get column names dynamically to handle schema changes
    IF NOT EXISTS (SELECT 1 FROM task_templates_archive LIMIT 1) THEN
      INSERT INTO task_templates_archive 
      SELECT * FROM task_templates
      ON CONFLICT DO NOTHING;
    END IF;

    -- 1.3: Verify backup
    SELECT COUNT(*) INTO archive_count FROM task_templates_archive;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'task_templates_archive' AND column_name = 'is_template_library') THEN
      SELECT COUNT(*) INTO library_count FROM task_templates_archive WHERE is_template_library = true;
      SELECT COUNT(*) INTO custom_count FROM task_templates_archive WHERE is_template_library = false;
      RAISE NOTICE 'Templates archived: % (Library: %, Custom: %)', archive_count, library_count, custom_count;
    ELSE
      RAISE NOTICE 'Templates archived: %', archive_count;
    END IF;

    -- 1.4: DELETE EVERYTHING (Point of no return)
    -- Only delete if tables exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checklist_tasks') THEN
      DELETE FROM checklist_tasks; -- All task instances gone
    END IF;
    
    DELETE FROM task_templates WHERE is_template_library = false; -- Custom templates gone (but archived)

    -- 1.5: Verify cleanup
    DECLARE
      tasks_remaining INTEGER;
      custom_remaining INTEGER;
      library_remaining INTEGER;
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checklist_tasks') THEN
        SELECT COUNT(*) INTO tasks_remaining FROM checklist_tasks;
      ELSE
        tasks_remaining := 0;
      END IF;
      
      SELECT COUNT(*) INTO custom_remaining FROM task_templates WHERE is_template_library = false;
      SELECT COUNT(*) INTO library_remaining FROM task_templates WHERE is_template_library = true;
      
      RAISE NOTICE 'Cleanup complete:';
      RAISE NOTICE '  Tasks remaining: % (expected: 0)', tasks_remaining;
      RAISE NOTICE '  Custom templates remaining: % (expected: 0)', custom_remaining;
      RAISE NOTICE '  Library templates kept: %', library_remaining;
    END;
  ELSE
    RAISE NOTICE '⚠️ task_templates table does not exist yet - skipping archive and cleanup';
  END IF;
END $$;

