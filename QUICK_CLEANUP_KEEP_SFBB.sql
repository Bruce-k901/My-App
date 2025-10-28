-- 🚀 QUICK TASK CLEANUP - Keep Only SFBB Temperature Tasks
-- Copy and run these commands one at a time in Supabase SQL Editor

-- ============================================
-- STEP 1: Delete ALL tasks EXCEPT SFBB Temperature Checks
-- ============================================
DELETE FROM public.tasks 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
AND NOT (name ILIKE '%SFBB%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%');

-- ============================================
-- STEP 2: Delete ALL site_checklists EXCEPT SFBB Temperature Checks
-- ============================================
DELETE FROM public.site_checklists 
WHERE site_id = (SELECT site_id FROM public.profiles WHERE id = auth.uid())
AND NOT (name ILIKE '%SFBB%' OR name ILIKE '%temperature%' OR name ILIKE '%temp%');

-- ============================================
-- STEP 3: Delete ALL checklist_templates EXCEPT SFBB Temperature Checks
-- ============================================
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
-- STEP 5: Delete ALL checklist_tasks EXCEPT SFBB Temperature Checks
-- ============================================
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
-- Count remaining tasks
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
