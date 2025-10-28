-- 🧹 SAFE TASK CLEANUP SCRIPT - Check Columns First
-- This version checks if columns exist before using them
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Check what columns exist in tasks table
-- ============================================
SELECT 'CHECKING TASKS TABLE STRUCTURE:' as info;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tasks' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================
-- STEP 2: Check what columns exist in site_checklists table
-- ============================================
SELECT 'CHECKING SITE_CHECKLISTS TABLE STRUCTURE:' as info;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'site_checklists' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================
-- STEP 3: Check what columns exist in checklist_templates table
-- ============================================
SELECT 'CHECKING CHECKLIST_TEMPLATES TABLE STRUCTURE:' as info;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'checklist_templates' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================
-- STEP 4: Check what columns exist in task_templates table
-- ============================================
SELECT 'CHECKING TASK_TEMPLATES TABLE STRUCTURE:' as info;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'task_templates' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================
-- STEP 5: Check what columns exist in checklist_tasks table
-- ============================================
SELECT 'CHECKING CHECKLIST_TASKS TABLE STRUCTURE:' as info;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'checklist_tasks' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================
-- STEP 6: Show current data in each table
-- ============================================
SELECT 'CURRENT DATA IN TASKS TABLE:' as info;
SELECT COUNT(*) as total_tasks FROM public.tasks 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

SELECT 'CURRENT DATA IN SITE_CHECKLISTS TABLE:' as info;
SELECT COUNT(*) as total_site_checklists FROM public.site_checklists 
WHERE site_id = (SELECT site_id FROM public.profiles WHERE id = auth.uid());

SELECT 'CURRENT DATA IN CHECKLIST_TEMPLATES TABLE:' as info;
SELECT COUNT(*) as total_checklist_templates FROM public.checklist_templates 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

SELECT 'CURRENT DATA IN TASK_TEMPLATES TABLE:' as info;
SELECT COUNT(*) as total_task_templates FROM public.task_templates 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

SELECT 'CURRENT DATA IN CHECKLIST_TASKS TABLE:' as info;
SELECT COUNT(*) as total_checklist_tasks FROM public.checklist_tasks 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());
