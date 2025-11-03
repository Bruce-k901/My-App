-- ============================================================================
-- FULL DROP OF ALL TASK SYSTEM TABLES AND DEPENDENCIES
-- ============================================================================
-- WARNING: This will delete ALL task-related data!
-- Only run if you're okay losing all existing task data.

-- Drop dependent tables first
DROP TABLE IF EXISTS public.contractor_callouts CASCADE;
DROP TABLE IF EXISTS public.task_completion_records CASCADE;
DROP TABLE IF EXISTS public.checklist_tasks CASCADE;
DROP TABLE IF EXISTS public.template_repeatable_labels CASCADE;
DROP TABLE IF EXISTS public.template_fields CASCADE;
DROP TABLE IF EXISTS public.task_templates CASCADE;

-- Drop old system tables if they exist
DROP TABLE IF EXISTS public.task_fields CASCADE;
DROP TABLE IF EXISTS public.task_instances CASCADE;
DROP TABLE IF EXISTS public.task_completion_logs CASCADE;
DROP TABLE IF EXISTS public.task_repeatable_labels CASCADE;

-- Drop indexes
DROP INDEX IF EXISTS public.idx_template_fields_template_id;
DROP INDEX IF EXISTS public.idx_template_fields_order;
DROP INDEX IF EXISTS public.idx_repeatable_labels_template_id;
DROP INDEX IF EXISTS public.idx_checklist_tasks_site_status;
DROP INDEX IF EXISTS public.idx_checklist_tasks_due_date;
DROP INDEX IF EXISTS public.idx_checklist_tasks_assigned_user;
DROP INDEX IF EXISTS public.idx_checklist_tasks_template_date;
DROP INDEX IF EXISTS public.idx_checklist_tasks_company_site_date;
DROP INDEX IF EXISTS public.idx_task_completions_task_id;
DROP INDEX IF EXISTS public.idx_task_completions_template_date;
DROP INDEX IF EXISTS public.idx_task_completions_site_date;
DROP INDEX IF EXISTS public.idx_task_completions_completed_by;
DROP INDEX IF EXISTS public.idx_task_completions_company_date;
DROP INDEX IF EXISTS public.idx_contractor_callouts_site;
DROP INDEX IF EXISTS public.idx_contractor_callouts_status;
DROP INDEX IF EXISTS public.idx_contractor_callouts_contractor;
DROP INDEX IF EXISTS public.idx_contractor_callouts_requested_date;
DROP INDEX IF EXISTS public.idx_task_templates_company_active;
DROP INDEX IF EXISTS public.idx_task_templates_library;
DROP INDEX IF EXISTS public.idx_task_templates_category;
DROP INDEX IF EXISTS public.idx_task_templates_site;

-- Drop triggers
DROP TRIGGER IF EXISTS trg_task_templates_updated ON public.task_templates;
DROP TRIGGER IF EXISTS trg_checklist_tasks_updated ON public.checklist_tasks;
DROP TRIGGER IF EXISTS trg_contractor_callouts_updated ON public.contractor_callouts;

-- Drop functions
DROP FUNCTION IF EXISTS public.task_templates_set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.checklist_tasks_set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.contractor_callouts_set_updated_at() CASCADE;

-- Now run the checklist migration to recreate everything
-- File: supabase/migrations/001_create_checklist_schema.sql

