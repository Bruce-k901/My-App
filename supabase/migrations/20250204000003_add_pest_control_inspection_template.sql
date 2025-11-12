-- Migration: 20250204000003_add_pest_control_inspection_template.sql
-- Description: Adds Weekly Pest Control Device Inspection template to compliance library
-- Template 3: Pest Control Inspection
-- Critical: Any sign of pest activity should trigger a callout

-- Clean up: Delete existing template and all its fields/labels if it exists
DELETE FROM public.template_repeatable_labels 
WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'weekly_pest_control_inspection');

DELETE FROM public.template_fields 
WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'weekly_pest_control_inspection');

DELETE FROM public.task_templates 
WHERE slug = 'weekly_pest_control_inspection';

-- Weekly Pest Control Device Inspection Template
-- Create fresh template with checklist items in recurrence_pattern
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
  recurrence_pattern,
  assigned_to_role,
  compliance_standard, 
  is_critical, 
  is_template_library,
  evidence_types,
  instructions,
  repeatable_field_name, -- Explicitly set to NULL to prevent asset dropdowns
  triggers_contractor_on_failure,
  contractor_type
) VALUES (
  NULL, -- Global template (available to all companies)
  'Weekly Pest Control Device Inspection',
  'weekly_pest_control_inspection',
  'Inspect all pest control devices and log findings',
  'food_safety',
  'food_safety',
  'weekly',
  '07:00',
  ARRAY['before_open'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('before_open', '07:00'),
    'default_checklist_items', jsonb_build_array(
      'Check all mouse traps in storage areas',
      'Inspect insectocutors in food preparation areas',
      'Examine bait stations in external areas',
      'Look for droppings or gnaw marks',
      'Check for entry points around doors/windows',
      'Verify no pest activity in dry goods storage',
      'Document findings and take photos if needed'
    )
  ), -- Weekly recurrence pattern with checklist items
  'manager',
  'Food Safety Act 1990',
  TRUE, -- Critical compliance task
  TRUE, -- Library template
  ARRAY['pass_fail', 'photo', 'text_note'], -- Includes 'text_note' for checklist feature
  'Purpose:
Monitor for signs of pest activity and confirm control measures are effective

Importance:
Early detection prevents infestations and enforcement action

Method:
Inspect traps, bait stations, and high-risk zones; photograph any activity

Special Requirements:
If activity found, tag for 24-hour follow-up and notify pest contractor',
  NULL, -- repeatable_field_name: NULL means no asset/equipment dropdowns
  TRUE, -- CRITICAL: Triggers contractor callout on failure
  'pest_control' -- Contractor type for pest control
);

-- Fields for Weekly Pest Control Device Inspection
-- Overall Pass/Fail field (CRITICAL - failure triggers callout)
INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'overall_assessment', 'pass_fail', 'Overall Assessment', true, 1, 'FAIL if any pest activity is detected. This will trigger a pest control contractor callout.'
FROM task_templates WHERE slug = 'weekly_pest_control_inspection';

-- Notes field (for additional observations)
INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'notes', 'text', 'Additional Notes', false, 2, 'Record any additional observations or actions taken'
FROM task_templates WHERE slug = 'weekly_pest_control_inspection';

-- Note: Checklist items are stored in recurrence_pattern.default_checklist_items
-- They will be automatically populated in task_data.checklistItems when tasks are created
-- The checklist feature is enabled via evidence_types: 'text_note'

-- Verification
DO $$
DECLARE
  template_id UUID;
  template_evidence_types TEXT[];
  checklist_items JSONB;
BEGIN
  SELECT id, evidence_types, recurrence_pattern->'default_checklist_items' 
  INTO template_id, template_evidence_types, checklist_items
  FROM task_templates WHERE slug = 'weekly_pest_control_inspection';
  
  IF template_id IS NULL THEN
    RAISE EXCEPTION 'Template not found or created successfully';
  END IF;
  
  -- Verify critical settings
  IF NOT (SELECT triggers_contractor_on_failure FROM task_templates WHERE id = template_id) THEN
    RAISE EXCEPTION 'Template created but triggers_contractor_on_failure is not set to TRUE';
  END IF;
  
  IF NOT (SELECT contractor_type = 'pest_control' FROM task_templates WHERE id = template_id) THEN
    RAISE EXCEPTION 'Template created but contractor_type is not set to pest_control';
  END IF;
  
  -- Verify checklist items are present
  IF checklist_items IS NULL OR jsonb_array_length(checklist_items) = 0 THEN
    RAISE WARNING '⚠️  Checklist items not found in recurrence_pattern.default_checklist_items';
  ELSE
    RAISE NOTICE '✅ Checklist items found: % items', jsonb_array_length(checklist_items);
  END IF;
  
  RAISE NOTICE '✅ Weekly Pest Control Device Inspection template updated successfully (ID: %)', template_id;
  RAISE NOTICE '   Evidence types: %', array_to_string(template_evidence_types, ', ');
  RAISE NOTICE '   Contractor trigger: ENABLED (pest_control)';
  RAISE NOTICE '   Checklist items: %', jsonb_array_length(checklist_items);
  RAISE NOTICE '   ⚠️  IMPORTANT: Ensure pest control contractors are set up in the contractors table';
END $$;

