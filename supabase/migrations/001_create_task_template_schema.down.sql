-- DOWN Migration: Rollback task template schema
-- This reverses 001_create_task_template_schema.sql
-- WARNING: This will DELETE ALL DATA in these tables!

-- Drop triggers first
DROP TRIGGER IF EXISTS trg_task_templates_updated ON public.task_templates;
DROP TRIGGER IF EXISTS trg_task_fields_updated ON public.task_fields;
DROP TRIGGER IF EXISTS trg_task_instances_updated ON public.task_instances;

-- Drop trigger functions
DROP FUNCTION IF EXISTS public.task_templates_set_updated_at();
DROP FUNCTION IF EXISTS public.task_fields_set_updated_at();
DROP FUNCTION IF EXISTS public.task_instances_set_updated_at();

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.task_completion_logs CASCADE;
DROP TABLE IF EXISTS public.task_repeatable_labels CASCADE;
DROP TABLE IF EXISTS public.task_fields CASCADE;
DROP TABLE IF EXISTS public.task_instances CASCADE;
DROP TABLE IF EXISTS public.task_templates CASCADE;

