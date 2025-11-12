-- ============================================================================
-- Migration: 20251111092000_add_template_notes.sql
-- Description: Adds optional notes to task templates and instance tasks
-- ============================================================================

alter table if exists public.task_templates
  add column if not exists notes text;

do $$
begin
  if to_regclass('public.task_templates') is not null then
    comment on column public.task_templates.notes is 'Optional guidance/notes surfaced to task instances and alerts.';
  end if;
end
$$;

alter table if exists public.checklist_templates
  add column if not exists notes text;

do $$
begin
  if to_regclass('public.checklist_templates') is not null then
    comment on column public.checklist_templates.notes is 'Optional global notes displayed when using this checklist template.';
  end if;
end
$$;

alter table if exists public.site_checklists
  add column if not exists notes text;

do $$
begin
  if to_regclass('public.site_checklists') is not null then
    comment on column public.site_checklists.notes is 'Site-specific notes attached to the checklist instance.';
  end if;
end
$$;

alter table if exists public.tasks
  add column if not exists template_notes text;

do $$
begin
  if to_regclass('public.tasks') is not null then
    comment on column public.tasks.template_notes is 'Notes inherited from the originating task template.';
  end if;
end
$$;


