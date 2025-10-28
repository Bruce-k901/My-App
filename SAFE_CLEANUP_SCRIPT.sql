-- 🧹 CORRECTED TASK CLEANUP SCRIPT
-- Based on actual table structure - handles missing columns gracefully
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Delete from tasks table (if it exists and has name column)
-- ============================================
-- Only run this if the tasks table has a 'name' column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND table_schema = 'public' 
        AND column_name = 'name'
    ) THEN
        DELETE FROM public.tasks 
        WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND NOT (name ILIKE '%SFBB%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%');
        
        RAISE NOTICE 'Deleted non-SFBB tasks from tasks table';
    ELSE
        RAISE NOTICE 'Tasks table does not have name column, skipping';
    END IF;
END $$;

-- ============================================
-- STEP 2: Delete from site_checklists table
-- ============================================
-- Only run this if the site_checklists table has a 'name' column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'site_checklists' 
        AND table_schema = 'public' 
        AND column_name = 'name'
    ) THEN
        DELETE FROM public.site_checklists 
        WHERE site_id = (SELECT site_id FROM public.profiles WHERE id = auth.uid())
        AND NOT (name ILIKE '%SFBB%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%');
        
        RAISE NOTICE 'Deleted non-SFBB site_checklists';
    ELSE
        RAISE NOTICE 'Site_checklists table does not have name column, skipping';
    END IF;
END $$;

-- ============================================
-- STEP 3: Delete from checklist_templates table
-- ============================================
-- Only run this if the checklist_templates table has a 'name' column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'checklist_templates' 
        AND table_schema = 'public' 
        AND column_name = 'name'
    ) THEN
        DELETE FROM public.checklist_templates 
        WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND NOT (name ILIKE '%SFBB%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%');
        
        RAISE NOTICE 'Deleted non-SFBB checklist_templates';
    ELSE
        RAISE NOTICE 'Checklist_templates table does not have name column, skipping';
    END IF;
END $$;

-- ============================================
-- STEP 4: Delete from task_templates table
-- ============================================
-- Only run this if the task_templates table has a 'name' column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_templates' 
        AND table_schema = 'public' 
        AND column_name = 'name'
    ) THEN
        DELETE FROM public.task_templates 
        WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND NOT (name ILIKE '%SFBB%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%');
        
        RAISE NOTICE 'Deleted non-SFBB task_templates';
    ELSE
        RAISE NOTICE 'Task_templates table does not have name column, skipping';
    END IF;
END $$;

-- ============================================
-- STEP 5: Delete from checklist_tasks table
-- ============================================
-- This table doesn't have a name column, so we'll delete based on template relationship
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'checklist_tasks' 
        AND table_schema = 'public'
    ) THEN
        DELETE FROM public.checklist_tasks 
        WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        AND NOT EXISTS (
            SELECT 1 FROM public.task_templates tt 
            WHERE tt.id = checklist_tasks.template_id 
            AND (tt.name ILIKE '%SFBB%' OR tt.name ILIKE '%temperature%' OR tt.name ILIKE '%temp%')
        );
        
        RAISE NOTICE 'Deleted non-SFBB checklist_tasks';
    ELSE
        RAISE NOTICE 'Checklist_tasks table does not exist, skipping';
    END IF;
END $$;

-- ============================================
-- VERIFICATION: Check what's left
-- ============================================
SELECT 'AFTER CLEANUP - REMAINING TASKS:' as info;

-- Check remaining tasks (if table exists and has name column)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND table_schema = 'public' 
        AND column_name = 'name'
    ) THEN
        PERFORM 1; -- This will execute the query below
    END IF;
END $$;

-- Show remaining tasks
SELECT 
  'tasks' as table_name,
  COUNT(*) as count
FROM public.tasks 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

-- Show remaining site_checklists
SELECT 
  'site_checklists' as table_name,
  COUNT(*) as count
FROM public.site_checklists 
WHERE site_id = (SELECT site_id FROM public.profiles WHERE id = auth.uid());

-- Show remaining checklist_templates
SELECT 
  'checklist_templates' as table_name,
  COUNT(*) as count
FROM public.checklist_templates 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

-- Show remaining task_templates
SELECT 
  'task_templates' as table_name,
  COUNT(*) as count
FROM public.task_templates 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

-- Show remaining checklist_tasks
SELECT 
  'checklist_tasks' as table_name,
  COUNT(*) as count
FROM public.checklist_tasks 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());
