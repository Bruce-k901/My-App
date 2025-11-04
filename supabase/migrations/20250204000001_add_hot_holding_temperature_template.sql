-- Migration: 20250204000001_add_hot_holding_temperature_template.sql
-- Description: Adds Hot Holding Temperature Verification template to compliance library
-- Template 2: Hot Holding Temperature Check

-- Hot Holding Temperature Verification Template
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
  repeatable_field_name, 
  evidence_types,
  instructions
) VALUES (
  NULL, -- Global template (available to all companies)
  'Hot Holding Temperature Verification',
  'hot_holding_temperature_verification',
  'Verify hot holding equipment maintains safe temperatures above 63°C',
  'food_safety',
  'food_safety',
  'daily',
  'during_service',
  ARRAY['during_service'],
  'BOH',
  'Food Safety Act 1990',
  TRUE, -- Critical compliance task
  TRUE, -- Library template
  'equipment_name',
  ARRAY['temperature', 'text_note'],
  'Purpose:
Ensure hot holding equipment maintains food at safe temperatures above 63°C

Importance:
Prevents bacterial growth and ensures food safety compliance

Method:
Check each hot holding unit with calibrated probe thermometer and record temperatures

Special Requirements:
Recheck any unit below 63°C immediately and escalate to manager'
) RETURNING id;

-- Fields for Hot Holding Temperature Verification
-- Equipment Name (repeatable field)
INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'equipment_name', 'repeatable_record', 'Equipment Name', true, 1, 'Select the hot holding equipment being checked'
FROM task_templates WHERE slug = 'hot_holding_temperature_verification';

-- Temperature field
INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, min_value, max_value, warn_threshold, fail_threshold, field_order, help_text)
SELECT id, 'temperature', 'number', 'Temperature (°C)', true, 63, 100, 65, 63, 2, 'Hot holding must be above 63°C. Recheck immediately if below 63°C'
FROM task_templates WHERE slug = 'hot_holding_temperature_verification';

-- Notes field
INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'notes', 'text', 'Notes', false, 3, 'Record any observations or actions taken'
FROM task_templates WHERE slug = 'hot_holding_temperature_verification';

-- Repeatable field options (equipment options)
INSERT INTO public.template_repeatable_labels (template_id, label, label_value, is_default, display_order)
SELECT id, 'Bain-marie', 'bain_marie', true, 1 FROM task_templates WHERE slug = 'hot_holding_temperature_verification'
UNION ALL
SELECT id, 'Hot cabinet', 'hot_cabinet', true, 2 FROM task_templates WHERE slug = 'hot_holding_temperature_verification'
UNION ALL
SELECT id, 'Soup kettle', 'soup_kettle', true, 3 FROM task_templates WHERE slug = 'hot_holding_temperature_verification'
UNION ALL
SELECT id, 'Hot holding display', 'hot_holding_display', false, 4 FROM task_templates WHERE slug = 'hot_holding_temperature_verification';

-- Verification
DO $$
DECLARE
  template_id UUID;
BEGIN
  SELECT id INTO template_id FROM task_templates WHERE slug = 'hot_holding_temperature_verification';
  
  IF template_id IS NULL THEN
    RAISE EXCEPTION 'Template not created successfully';
  END IF;
  
  RAISE NOTICE '✅ Hot Holding Temperature Verification template created successfully (ID: %)', template_id;
END $$;




