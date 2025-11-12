-- ============================================================================
-- DIAGNOSE ALL TASK TABLES
-- This script identifies all task-related tables and checks for duplicates
-- ============================================================================

-- STEP 1: List all task-related tables that exist
SELECT 
  'Existing Task Tables' as info,
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%task%' 
    OR table_name LIKE '%checklist%'
    OR table_name LIKE '%compliance%'
  )
ORDER BY table_name;

-- STEP 2: Check if checklist_tasks table exists and its structure
SELECT 
  'checklist_tasks Structure' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'checklist_tasks'
ORDER BY ordinal_position;

-- STEP 3: Check if task_templates table exists
SELECT 
  'task_templates Structure' as info,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'task_templates'
ORDER BY ordinal_position;

-- STEP 4: Count tasks in each table (only for tables that exist)
-- Using dynamic SQL to safely query only existing tables
DO $$
DECLARE
  v_result TEXT := '';
  v_count INTEGER;
BEGIN
  -- checklist_tasks
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checklist_tasks') THEN
    EXECUTE 'SELECT COUNT(*) FROM checklist_tasks' INTO v_count;
    v_result := v_result || 'checklist_tasks: ' || v_count || E'\n';
  END IF;
  
  -- tasks
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    EXECUTE 'SELECT COUNT(*) FROM tasks' INTO v_count;
    v_result := v_result || 'tasks: ' || v_count || E'\n';
  END IF;
  
  -- task_instances
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_instances') THEN
    EXECUTE 'SELECT COUNT(*) FROM task_instances' INTO v_count;
    v_result := v_result || 'task_instances: ' || v_count || E'\n';
  END IF;
  
  -- site_compliance_tasks
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'site_compliance_tasks') THEN
    EXECUTE 'SELECT COUNT(*) FROM site_compliance_tasks' INTO v_count;
    v_result := v_result || 'site_compliance_tasks: ' || v_count || E'\n';
  END IF;
  
  -- compliance_task_instances
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'compliance_task_instances') THEN
    EXECUTE 'SELECT COUNT(*) FROM compliance_task_instances' INTO v_count;
    v_result := v_result || 'compliance_task_instances: ' || v_count || E'\n';
  END IF;
  
  -- monitoring_tasks
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'monitoring_tasks') THEN
    EXECUTE 'SELECT COUNT(*) FROM monitoring_tasks' INTO v_count;
    v_result := v_result || 'monitoring_tasks: ' || v_count || E'\n';
  END IF;
  
  RAISE NOTICE 'Task Counts by Table:%', E'\n' || v_result;
END $$;

-- Alternative: Show which task tables exist (for reference)
SELECT 
  'Existing Task Tables' as info,
  table_name,
  'Run DO block above for counts' as note
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('checklist_tasks', 'tasks', 'task_instances', 'site_compliance_tasks', 'compliance_task_instances', 'monitoring_tasks')
ORDER BY table_name;

-- STEP 5: Check for duplicates in checklist_tasks (by name)
-- This will show if the script should work
WITH task_names AS (
  SELECT 
    ct.id,
    ct.site_id,
    ct.due_date,
    ct.daypart,
    ct.due_time,
    ct.created_at,
    ct.custom_name,
    COALESCE(ct.custom_name, tt.name, 'Unknown Task') as effective_name
  FROM checklist_tasks ct
  LEFT JOIN task_templates tt ON tt.id = ct.template_id
  WHERE ct.template_id IS NOT NULL
)
SELECT 
  'Duplicate Check - checklist_tasks' as info,
  effective_name,
  site_id,
  due_date,
  COALESCE(daypart, '') as daypart,
  COALESCE(due_time::text, '') as due_time,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY created_at) as task_ids
FROM task_names
GROUP BY effective_name, site_id, due_date, COALESCE(daypart, ''), COALESCE(due_time::text, '')
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, effective_name
LIMIT 20;

-- STEP 6: Check for tasks without valid templates
SELECT 
  'Orphaned Tasks Check' as info,
  COUNT(*) as orphaned_count,
  COUNT(*) FILTER (WHERE template_id IS NULL) as null_template_id,
  COUNT(*) FILTER (WHERE template_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM task_templates tt WHERE tt.id = checklist_tasks.template_id
  )) as missing_template
FROM checklist_tasks;

-- STEP 7: Sample data from checklist_tasks to verify structure
SELECT 
  'Sample Data' as info,
  id,
  template_id,
  site_id,
  due_date,
  daypart,
  due_time,
  custom_name,
  created_at,
  status
FROM checklist_tasks
ORDER BY created_at DESC
LIMIT 10;

