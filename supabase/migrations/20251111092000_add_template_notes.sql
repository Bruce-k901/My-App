-- ============================================================================
-- Migration: 20251111092000_add_template_notes.sql
-- Description: Adds optional notes to task templates and instance tasks
-- ============================================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Add notes to task_templates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates') THEN
    ALTER TABLE public.task_templates
      ADD COLUMN IF NOT EXISTS notes text;
    
    COMMENT ON COLUMN public.task_templates.notes IS 'Optional guidance/notes surfaced to task instances and alerts.';
  END IF;

  -- Add notes to checklist_templates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'checklist_templates') THEN
    ALTER TABLE public.checklist_templates
      ADD COLUMN IF NOT EXISTS notes text;
    
    COMMENT ON COLUMN public.checklist_templates.notes IS 'Optional global notes displayed when using this checklist template.';
  END IF;

  -- Add notes to site_checklists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'site_checklists') THEN
    ALTER TABLE public.site_checklists
      ADD COLUMN IF NOT EXISTS notes text;
    
    COMMENT ON COLUMN public.site_checklists.notes IS 'Site-specific notes attached to the checklist instance.';
  END IF;

  -- Add template_notes to tasks
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    ALTER TABLE public.tasks
      ADD COLUMN IF NOT EXISTS template_notes text;
    
    COMMENT ON COLUMN public.tasks.template_notes IS 'Notes inherited from the originating task template.';
  END IF;

  RAISE NOTICE 'Added notes columns to template and task tables';
END $$;


