-- 🚀 SIMPLE CLEANUP - Delete Everything Except SFBB
-- This version is safer and handles missing columns gracefully
-- Run these commands one at a time in Supabase SQL Editor

-- ============================================
-- STEP 1: Delete ALL tasks (if tasks table exists)
-- ============================================
-- This will delete all tasks regardless of name
DELETE FROM public.tasks 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

-- ============================================
-- STEP 2: Delete ALL site_checklists (if table exists)
-- ============================================
DELETE FROM public.site_checklists 
WHERE site_id = (SELECT site_id FROM public.profiles WHERE id = auth.uid());

-- ============================================
-- STEP 3: Delete ALL checklist_templates EXCEPT SFBB Temperature Checks
-- ============================================
-- This is the safest approach - keep only SFBB templates
DELETE FROM public.checklist_templates 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
AND NOT (name ILIKE '%SFBB%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%');

-- ============================================
-- STEP 4: Delete ALL task_templates EXCEPT SFBB Temperature Checks
-- ============================================
DELETE FROM public.task_templates 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
AND NOT (name ILIKE '%SFBB%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%');

-- ============================================
-- STEP 5: Delete ALL checklist_tasks (if table exists)
-- ============================================
DELETE FROM public.checklist_tasks 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

-- ============================================
-- VERIFICATION: Check what's left
-- ============================================
-- Count remaining items
SELECT 'TASKS REMAINING:' as info, COUNT(*) as count FROM public.tasks 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

SELECT 'SITE_CHECKLISTS REMAINING:' as info, COUNT(*) as count FROM public.site_checklists 
WHERE site_id = (SELECT site_id FROM public.profiles WHERE id = auth.uid());

SELECT 'CHECKLIST_TEMPLATES REMAINING:' as info, COUNT(*) as count FROM public.checklist_templates 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

SELECT 'TASK_TEMPLATES REMAINING:' as info, COUNT(*) as count FROM public.task_templates 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

SELECT 'CHECKLIST_TASKS REMAINING:' as info, COUNT(*) as count FROM public.checklist_tasks 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

-- ============================================
-- SHOW REMAINING SFBB TEMPLATES
-- ============================================
SELECT 'REMAINING SFBB TEMPLATES:' as info;
SELECT id, name, created_at FROM public.checklist_templates 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
ORDER BY created_at DESC;

SELECT 'REMAINING SFBB TASK TEMPLATES:' as info;
SELECT id, name, created_at FROM public.task_templates 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
ORDER BY created_at DESC;
