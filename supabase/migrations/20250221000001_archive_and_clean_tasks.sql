-- ============================================================================
-- STEP 1: ARCHIVE TEMPLATES & CLEAN EVERYTHING
-- ============================================================================

-- 1.1: Create archive table
CREATE TABLE IF NOT EXISTS task_templates_archive (
  LIKE task_templates INCLUDING ALL
);

-- 1.2: Backup ALL templates
INSERT INTO task_templates_archive 
SELECT * FROM task_templates
ON CONFLICT DO NOTHING;

-- 1.3: Verify backup
DO $$
DECLARE
  archive_count INTEGER;
  library_count INTEGER;
  custom_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO archive_count FROM task_templates_archive;
  SELECT COUNT(*) INTO library_count FROM task_templates_archive WHERE is_template_library = true;
  SELECT COUNT(*) INTO custom_count FROM task_templates_archive WHERE is_template_library = false;
  
  RAISE NOTICE 'Templates archived: % (Library: %, Custom: %)', archive_count, library_count, custom_count;
END $$;

-- 1.4: DELETE EVERYTHING (Point of no return)
DELETE FROM checklist_tasks; -- All task instances gone
DELETE FROM task_templates WHERE is_template_library = false; -- Custom templates gone (but archived)

-- 1.5: Verify cleanup
DO $$
DECLARE
  tasks_remaining INTEGER;
  custom_remaining INTEGER;
  library_remaining INTEGER;
BEGIN
  SELECT COUNT(*) INTO tasks_remaining FROM checklist_tasks;
  SELECT COUNT(*) INTO custom_remaining FROM task_templates WHERE is_template_library = false;
  SELECT COUNT(*) INTO library_remaining FROM task_templates WHERE is_template_library = true;
  
  RAISE NOTICE 'Cleanup complete:';
  RAISE NOTICE '  Tasks remaining: % (expected: 0)', tasks_remaining;
  RAISE NOTICE '  Custom templates remaining: % (expected: 0)', custom_remaining;
  RAISE NOTICE '  Library templates kept: %', library_remaining;
END $$;

