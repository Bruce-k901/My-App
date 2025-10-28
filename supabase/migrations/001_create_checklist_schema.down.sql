-- DOWN Migration: Rollback checklist schema
-- This reverses 001_create_checklist_schema.sql
-- WARNING: This will DELETE ALL DATA in these tables!

-- Drop triggers first
DROP TRIGGER IF EXISTS trg_task_templates_updated ON public.task_templates;
DROP TRIGGER IF EXISTS trg_checklist_tasks_updated ON public.checklist_tasks;
DROP TRIGGER IF EXISTS trg_contractor_callouts_updated ON public.contractor_callouts;

-- Drop trigger functions
DROP FUNCTION IF EXISTS public.task_templates_set_updated_at();
DROP FUNCTION IF EXISTS public.checklist_tasks_set_updated_at();
DROP FUNCTION IF EXISTS public.contractor_callouts_set_updated_at();

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.contractor_callouts CASCADE;
DROP TABLE IF EXISTS public.task_completion_records CASCADE;
DROP TABLE IF EXISTS public.checklist_tasks CASCADE;
DROP TABLE IF EXISTS public.template_repeatable_labels CASCADE;
DROP TABLE IF EXISTS public.template_fields CASCADE;
DROP TABLE IF EXISTS public.task_templates CASCADE;

