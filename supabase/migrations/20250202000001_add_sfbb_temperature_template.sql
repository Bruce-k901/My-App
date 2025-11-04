-- Migration: Add SFBB Temperature Checks compliance template
-- This template is pre-populated and ships with the app
-- Users can personalize it with their assets, timings, libraries, SOPs, RAs, etc.

-- Insert SFBB Temperature Checks template (global template - company_id = NULL)
INSERT INTO public.task_templates (
  company_id,
  name,
  slug,
  description,
  category,
  audit_category,
  frequency,
  time_of_day,
  dayparts,
  assigned_to_role,
  compliance_standard,
  is_critical,
  is_template_library,
  is_active,
  repeatable_field_name,
  evidence_types,
  instructions,
  triggers_contractor_on_failure
) VALUES (
  NULL, -- Global template available to all companies
  'SFBB Temperature Checks',
  'sfbb-temperature-checks',
  'Daily temperature monitoring for refrigerators, freezers, and hot holding units to ensure food safety compliance',
  'food_safety',
  'food_safety',
  'daily',
  'before_open',
  ARRAY['morning', 'afternoon', 'evening'],
  'kitchen_manager',
  'Food Safety Act / HACCP',
  FALSE,
  TRUE, -- This is a compliance template library template
  TRUE,
  'fridge_name',
  ARRAY['temperature', 'photo', 'pass_fail'],
  'Record temperature readings for all refrigeration and hot holding equipment. Check each unit and record the temperature. If temperature is out of acceptable range, follow the escalation workflow (monitor or callout).',
  TRUE
) 
ON CONFLICT (company_id, slug) DO NOTHING; -- Don't insert if already exists (unique constraint on company_id, slug)

-- Insert template fields for SFBB Temperature Checks
INSERT INTO public.template_fields (
  template_id,
  field_name,
  field_type,
  label,
  required,
  min_value,
  max_value,
  field_order,
  help_text
)
SELECT 
  t.id,
  'fridge_name',
  'select',
  'Equipment Name',
  TRUE,
  NULL,
  NULL,
  1,
  'Select the equipment unit being checked'
FROM public.task_templates t
WHERE t.slug = 'sfbb-temperature-checks'
  AND t.company_id IS NULL -- Ensure we're matching the global template
  AND NOT EXISTS (
    SELECT 1 FROM public.template_fields tf 
    WHERE tf.template_id = t.id AND tf.field_name = 'fridge_name'
  );

INSERT INTO public.template_fields (
  template_id,
  field_name,
  field_type,
  label,
  required,
  min_value,
  max_value,
  field_order,
  help_text
)
SELECT 
  t.id,
  'temperature',
  'number',
  'Temperature (°C)',
  TRUE,
  -20,
  50,
  2,
  'Record the temperature reading from the equipment'
FROM public.task_templates t
WHERE t.slug = 'sfbb-temperature-checks'
  AND t.company_id IS NULL -- Ensure we're matching the global template
  AND NOT EXISTS (
    SELECT 1 FROM public.template_fields tf 
    WHERE tf.template_id = t.id AND tf.field_name = 'temperature'
  );

INSERT INTO public.template_fields (
  template_id,
  field_name,
  field_type,
  label,
  required,
  field_order,
  help_text
)
SELECT 
  t.id,
  'status',
  'pass_fail',
  'Status',
  TRUE,
  3,
  'Pass if temperature is within acceptable range'
FROM public.task_templates t
WHERE t.slug = 'sfbb-temperature-checks'
  AND t.company_id IS NULL -- Ensure we're matching the global template
  AND NOT EXISTS (
    SELECT 1 FROM public.template_fields tf 
    WHERE tf.template_id = t.id AND tf.field_name = 'status'
  );

INSERT INTO public.template_fields (
  template_id,
  field_name,
  field_type,
  label,
  required,
  field_order,
  help_text
)
SELECT 
  t.id,
  'initials',
  'text',
  'Initials',
  TRUE,
  4,
  'Enter your initials'
FROM public.task_templates t
WHERE t.slug = 'sfbb-temperature-checks'
  AND t.company_id IS NULL -- Ensure we're matching the global template
  AND NOT EXISTS (
    SELECT 1 FROM public.template_fields tf 
    WHERE tf.template_id = t.id AND tf.field_name = 'initials'
  );

INSERT INTO public.template_fields (
  template_id,
  field_name,
  field_type,
  label,
  required,
  field_order,
  help_text
)
SELECT 
  t.id,
  'photo',
  'photo',
  'Photo Evidence',
  FALSE,
  5,
  'Optional photo of the temperature reading'
FROM public.task_templates t
WHERE t.slug = 'sfbb-temperature-checks'
  AND t.company_id IS NULL -- Ensure we're matching the global template
  AND NOT EXISTS (
    SELECT 1 FROM public.template_fields tf 
    WHERE tf.template_id = t.id AND tf.field_name = 'photo'
  );

