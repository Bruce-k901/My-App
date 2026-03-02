-- ============================================================================
-- Migration: 20260228400000_add_custom_instructions_to_site_checklists.sql
-- Description: Add custom_instructions column to site_checklists table.
--              Previously, instructions were only stored on task_templates
--              (template-level) and checklist_tasks (instance-level). Site-level
--              instruction overrides typed by users were silently lost because
--              this column didn't exist.
-- ============================================================================

alter table site_checklists
  add column if not exists custom_instructions text default null;
