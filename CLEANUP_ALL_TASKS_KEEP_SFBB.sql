-- 🧹 COMPREHENSIVE TASK CLEANUP SCRIPT
-- Keep ONLY SFBB Temperature Check tasks, delete everything else
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Identify SFBB Temperature Check Tasks
-- ============================================
-- First, let's see what SFBB tasks exist
SELECT 'SFBB Tasks Found:' as info;
SELECT 
  'tasks' as table_name,
  id, name, task_type, status, created_at
FROM public.tasks 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
AND (name ILIKE '%SFBB%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%')
ORDER BY created_at DESC;

SELECT 
  'site_checklists' as table_name,
  id, name, day_part, active, created_at
FROM public.site_checklists 
WHERE site_id = (SELECT site_id FROM public.profiles WHERE id = auth.uid())
AND (name ILIKE '%SFBB%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%')
ORDER BY created_at DESC;

SELECT 
  'checklist_templates' as table_name,
  id, name, category, active, created_at
FROM public.checklist_templates 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
AND (name ILIKE '%SFBB%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%')
ORDER BY created_at DESC;

-- ============================================
-- STEP 2: Delete ALL tasks EXCEPT SFBB Temperature Checks
-- ============================================
-- Delete from tasks table (My Tasks page)
DELETE FROM public.tasks 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
AND NOT (name ILIKE '%SFBB%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%');

-- ============================================
-- STEP 3: Delete ALL site_checklists EXCEPT SFBB Temperature Checks
-- ============================================
-- Delete from site_checklists table (deployed tasks)
DELETE FROM public.site_checklists 
WHERE site_id = (SELECT site_id FROM public.profiles WHERE id = auth.uid())
AND NOT (name ILIKE '%SFBB%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%');

-- ============================================
-- STEP 4: Delete ALL checklist_templates EXCEPT SFBB Temperature Checks
-- ============================================
-- Delete from checklist_templates table (template definitions)
DELETE FROM public.checklist_templates 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
AND NOT (name ILIKE '%SFBB%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%');

-- ============================================
-- STEP 5: Delete from task_templates table (if it exists)
-- ============================================
-- Delete from task_templates table (newer task system)
DELETE FROM public.task_templates 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
AND NOT (name ILIKE '%SFBB%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%');

-- ============================================
-- STEP 6: Delete from checklist_tasks table (if it exists)
-- ============================================
-- Delete from checklist_tasks table (newer task system)
DELETE FROM public.checklist_tasks 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
AND NOT EXISTS (
  SELECT 1 FROM public.task_templates tt 
  WHERE tt.id = checklist_tasks.template_id 
  AND (tt.name ILIKE '%SFBB%' OR tt.name ILIKE '%temperature%' OR tt.name ILIKE '%temp%')
);

-- ============================================
-- VERIFICATION: Check what's left
-- ============================================
SELECT 'AFTER CLEANUP - Remaining Tasks:' as info;

-- Check remaining tasks
SELECT 
  'tasks' as table_name,
  COUNT(*) as count,
  STRING_AGG(name, ', ') as task_names
FROM public.tasks 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

-- Check remaining site_checklists
SELECT 
  'site_checklists' as table_name,
  COUNT(*) as count,
  STRING_AGG(name, ', ') as checklist_names
FROM public.site_checklists 
WHERE site_id = (SELECT site_id FROM public.profiles WHERE id = auth.uid());

-- Check remaining checklist_templates
SELECT 
  'checklist_templates' as table_name,
  COUNT(*) as count,
  STRING_AGG(name, ', ') as template_names
FROM public.checklist_templates 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

-- Check remaining task_templates
SELECT 
  'task_templates' as table_name,
  COUNT(*) as count,
  STRING_AGG(name, ', ') as template_names
FROM public.task_templates 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

-- Check remaining checklist_tasks
SELECT 
  'checklist_tasks' as table_name,
  COUNT(*) as count
FROM public.checklist_tasks 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

-- ============================================
-- DETAILED VIEW: Show remaining SFBB tasks
-- ============================================
SELECT 'REMAINING SFBB TASKS DETAILS:' as info;

-- Show detailed SFBB tasks
SELECT 
  'tasks' as table_name,
  id, name, task_type, status, due_date, created_at
FROM public.tasks 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
AND (name ILIKE '%SFBB%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%')
ORDER BY created_at DESC;

-- Show detailed SFBB site_checklists
SELECT 
  'site_checklists' as table_name,
  id, name, day_part, active, created_at
FROM public.site_checklists 
WHERE site_id = (SELECT site_id FROM public.profiles WHERE id = auth.uid())
AND (name ILIKE '%SFBB%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%')
ORDER BY created_at DESC;

-- Show detailed SFBB checklist_templates
SELECT 
  'checklist_templates' as table_name,
  id, name, category, active, created_at
FROM public.checklist_templates 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
AND (name ILIKE '%SFBB%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%')
ORDER BY created_at DESC;
