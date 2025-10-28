-- 🧹 FINAL CLEANUP - Delete All Database Tasks
-- The SFBB tasks are hardcoded in the frontend, so we just need to clean the database
-- Run these commands one at a time in Supabase SQL Editor

-- ============================================
-- STEP 1: Delete ALL tasks from database
-- ============================================
DELETE FROM public.tasks 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

-- ============================================
-- STEP 2: Delete ALL site_checklists from database
-- ============================================
DELETE FROM public.site_checklists 
WHERE site_id = (SELECT site_id FROM public.profiles WHERE id = auth.uid());

-- ============================================
-- STEP 3: Delete ALL checklist_templates from database
-- ============================================
DELETE FROM public.checklist_templates 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

-- ============================================
-- STEP 4: Delete ALL task_templates from database
-- ============================================
DELETE FROM public.task_templates 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

-- ============================================
-- STEP 5: Delete ALL checklist_tasks from database
-- ============================================
DELETE FROM public.checklist_tasks 
WHERE company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid());

-- ============================================
-- VERIFICATION: All should be 0
-- ============================================
SELECT 'DATABASE CLEANUP COMPLETE:' as status;

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
-- NOTE: SFBB tasks are hardcoded in frontend code
-- ============================================
SELECT 'IMPORTANT: SFBB Temperature Check tasks are hardcoded in the frontend code, not in the database!' as note;
SELECT 'They will still appear in the UI because they are generated from src/app/dashboard/checklists/templates/page.tsx' as explanation;
