-- Extend template_fields for custom form builder
-- Adds columns needed for dynamic check sheets: units, default values,
-- repeatable record nesting, and inline section headers.

-- Add missing columns to template_fields
ALTER TABLE public.template_fields
  ADD COLUMN IF NOT EXISTS min_value numeric,
  ADD COLUMN IF NOT EXISTS max_value numeric,
  ADD COLUMN IF NOT EXISTS warn_threshold numeric,
  ADD COLUMN IF NOT EXISTS fail_threshold numeric,
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS default_value text,
  ADD COLUMN IF NOT EXISTS parent_field_id uuid REFERENCES public.template_fields(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS section_label text;

-- Add use_custom_fields flag to task_templates
ALTER TABLE public.task_templates
  ADD COLUMN IF NOT EXISTS use_custom_fields boolean DEFAULT false;

-- Index for finding child fields of a repeatable_record
CREATE INDEX IF NOT EXISTS template_fields_parent_idx
  ON public.template_fields (parent_field_id)
  WHERE parent_field_id IS NOT NULL;
