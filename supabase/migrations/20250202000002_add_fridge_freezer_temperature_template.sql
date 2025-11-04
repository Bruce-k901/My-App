-- Migration: Add Fridge/Freezer Temperature Check compliance template
-- This template is pre-populated and ships with the app
-- Users can personalize it with their assets, timings, libraries, SOPs, RAs, etc.

-- Insert Fridge/Freezer Temperature Check template (global template - company_id = NULL)
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
  'Fridge/Freezer Temperature Check',
  'fridge-freezer-temperature-check',
  'Daily temperature monitoring for all refrigeration assets',
  'food_safety',
  'Handling & Storage',
  'daily',
  'before_open',
  ARRAY['before_open', 'during_service', 'after_service'],
  'kitchen_manager',
  'Food Safety Act / HACCP',
  TRUE, -- This is a critical compliance task
  TRUE, -- This is a compliance template library template
  TRUE,
  'asset_name', -- Repeatable field for multiple assets
  ARRAY['temperature', 'checklist'], -- Temperature logs and checklist
  '**What (Purpose):** Ensure chilled and frozen storage units are maintaining safe holding temperatures.

**Why (Importance):** Failure to maintain proper storage temperatures allows bacterial growth, breaching EHO standards.

**How (Method):**

1. Check each unit''s display temperature and confirm it reads ≤5°C for fridges and ≤-18°C for freezers.

2. Verify with a probe thermometer periodically.

3. Record readings in the temperature log.

4. Tag any unit outside limits for monitoring and recheck in 1 hour.',
  TRUE -- Triggers monitor/callout on out-of-range temperatures
) 
ON CONFLICT (company_id, slug) DO NOTHING; -- Don't insert if already exists (unique constraint on company_id, slug)

-- Insert template fields for Fridge/Freezer Temperature Check
-- Field 1: Asset Selection (dropdown)
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
  'asset_name',
  'select',
  'Refrigeration Asset',
  TRUE,
  1,
  'Select the refrigeration asset being checked (fridge or freezer)'
FROM public.task_templates t
WHERE t.slug = 'fridge-freezer-temperature-check'
  AND t.company_id IS NULL -- Ensure we're matching the global template
  AND NOT EXISTS (
    SELECT 1 FROM public.template_fields tf 
    WHERE tf.template_id = t.id AND tf.field_name = 'asset_name'
  );

-- Field 2: Temperature Reading
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
  -30, -- Minimum for freezers
  10, -- Maximum for fridges
  2,
  'Record the temperature reading. Fridges should be ≤5°C, freezers should be ≤-18°C'
FROM public.task_templates t
WHERE t.slug = 'fridge-freezer-temperature-check'
  AND t.company_id IS NULL -- Ensure we're matching the global template
  AND NOT EXISTS (
    SELECT 1 FROM public.template_fields tf 
    WHERE tf.template_id = t.id AND tf.field_name = 'temperature'
  );

-- Field 3: Checklist Items (as repeatable records)
-- Note: The checklist items will be stored as part of the task_data in the checklist_tasks table
-- This field is for the repeatable asset selection structure

-- Since checklist items are stored in task_data, we'll add a text field for notes/initials
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
  3,
  'Enter your initials to confirm the check'
FROM public.task_templates t
WHERE t.slug = 'fridge-freezer-temperature-check'
  AND t.company_id IS NULL -- Ensure we're matching the global template
  AND NOT EXISTS (
    SELECT 1 FROM public.template_fields tf 
    WHERE tf.template_id = t.id AND tf.field_name = 'initials'
  );




