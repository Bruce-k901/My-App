-- 🧹 ULTRA-SIMPLE CLEANUP - Delete Everything
-- No column checking, no complex queries - just delete all tasks
-- Run these commands one at a time in Supabase SQL Editor

-- ============================================
-- STEP 1: Delete ALL tasks (My Tasks page)
-- ============================================
DELETE FROM public.tasks 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

-- ============================================
-- STEP 2: Delete ALL site_checklists (Deployed tasks)
-- ============================================
DELETE FROM public.site_checklists 
WHERE site_id = (SELECT site_id FROM public.profiles WHERE id = auth.uid());

-- ============================================
-- STEP 3: Delete ALL checklist_templates (Template definitions)
-- ============================================
DELETE FROM public.checklist_templates 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

-- ============================================
-- STEP 4: Delete ALL task_templates (Newer template system)
-- ============================================
DELETE FROM public.task_templates 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

-- ============================================
-- STEP 5: Delete ALL checklist_tasks (Generated task instances)
-- ============================================
DELETE FROM public.checklist_tasks 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

-- ============================================
-- VERIFICATION: Check what's left (should all be 0)
-- ============================================
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
-- CONFIRMATION: All should show 0
-- ============================================
SELECT 'CLEANUP COMPLETE - All task tables should show 0 remaining' as status;
