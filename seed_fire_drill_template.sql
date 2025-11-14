-- ============================================================================
-- Seed Fire Drill Execution & Documentation Template - Standalone Script
-- Description: Creates the fire drill template directly
-- Run this in Supabase SQL Editor if template hasn't seeded
-- ============================================================================

begin;

-- Clean up existing template if it exists
delete from template_repeatable_labels
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'fire_drill_execution_documentation'
);

delete from template_fields
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'fire_drill_execution_documentation'
);

delete from task_templates
where company_id is null
  and slug = 'fire_drill_execution_documentation';

-- Create the template
insert into task_templates (
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
  is_active,
  evidence_types,
  instructions,
  repeatable_field_name,
  asset_type,
  requires_sop,
  triggers_contractor_on_failure,
  contractor_type
) values (
  null,
  'Fire Drill Execution & Documentation',
  'fire_drill_execution_documentation',
  'Biannual fire drill execution and documentation. Test alarm activation, record evacuation timing, conduct headcount at assembly points, verify fire warden duties, and document all findings. Critical for legal compliance and staff safety.',
  'h_and_s',
  'fire_safety',
  'monthly', -- Biannual (every 6 months) - using monthly frequency, scheduling handled via recurrence_pattern
  '14:00',
  array['during_service'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('during_service', '14:00'),
    'default_checklist_items', jsonb_build_array(
      'Alarm activation test',
      'Evacuation timing recorded',
      'Assembly point headcount',
      'Roll call completion',
      'Special assistance requirements addressed'
    ),
    'interval_months', 6 -- Biannual: every 6 months
  ),
  'manager',
  'Regulatory Reform (Fire Safety) Order 2005',
  true,
  true,
  true,
  array['yes_no_checklist', 'pass_fail', 'photo', 'text_note'],
  'Conduct a full fire drill evacuation. Activate alarm system, record evacuation start and completion times, conduct headcount at assembly points, verify all staff and visitors are accounted for, confirm fire wardens performed duties, and verify alarm was audible in all areas. Document any gaps or failures. Minor failures (slightly over time) require retraining. Major failures (missing staff/areas) require additional drill within 2 weeks. Critical failures (system failures) require immediate retraining and system repair.',
  null, -- NO asset selection
  null,
  true,
  true,
  'fire_engineer'
);

-- Add template fields (key fields)
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'drill_date', 'date', 'Drill Date', true, 1,
  'Date when the fire drill was conducted.'
FROM task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'drill_coordinator', 'text', 'Drill Coordinator Name', true, 2,
  'Name of the person coordinating the fire drill.',
  'e.g., John Smith'
FROM task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'alarm_activation_time', 'text', 'Alarm Activation Time', true, 3,
  'Time when the fire alarm was activated (HH:MM format).',
  'e.g., 14:05'
FROM task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'evacuation_start_time', 'text', 'Evacuation Start Time', true, 4,
  'Time when evacuation began (HH:MM format).',
  'e.g., 14:05'
FROM task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'evacuation_completion_time', 'text', 'Evacuation Completion Time', true, 5,
  'Time when all personnel reached assembly point (HH:MM format).',
  'e.g., 14:07'
FROM task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'total_evacuation_time_minutes', 'number', 'Total Evacuation Time (minutes)', true, 6,
  'Total time from alarm activation to completion (in minutes). Target: under 3 minutes.',
  'e.g., 2.5'
FROM task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'expected_staff_count', 'number', 'Expected Staff Count', true, 7,
  'Total number of staff expected to be on-site during the drill.',
  'e.g., 25'
FROM task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'actual_evacuated_count', 'number', 'Actual Evacuated Count', true, 8,
  'Total number of staff and visitors actually evacuated to assembly point.',
  'e.g., 27'
FROM task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'drill_assessment', 'pass_fail', 'Drill Assessment', true, 10,
  'PASS: Drill completed successfully - full evacuation under 3 minutes, all staff accounted for, fire wardens performed duties, alarm audible. FAIL: Drill incomplete or unsuccessful - timing exceeded, missing staff, system failures, or other critical issues.'
FROM task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'fire_warden_name', 'text', 'Fire Warden Name (Sign-off)', true, 11,
  'Name of the fire warden who verified the drill completion.',
  'e.g., Jane Doe'
FROM task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
SELECT id, 'severity_level', 'select', 'Severity Level (if failure)', false, 14,
  'Select the severity level based on drill performance.',
  jsonb_build_array(
    jsonb_build_object('value', 'minor', 'label', 'Minor: Slightly over time (3-4 minutes)'),
    jsonb_build_object('value', 'major', 'label', 'Major: Missing staff/areas not evacuated (5+ minutes)'),
    jsonb_build_object('value', 'critical', 'label', 'Critical: System failures or no evacuation')
  )
FROM task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'assembly_point_photos', 'photo', 'Assembly Point Photos', false, 22,
  'Upload photos showing the assembly point during headcount.'
FROM task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';

-- Verify template was created
DO $$
DECLARE
  template_count INTEGER;
  field_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count
  FROM task_templates
  WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation';
  
  IF template_count = 0 THEN
    RAISE EXCEPTION 'Template creation failed!';
  END IF;
  
  SELECT COUNT(*) INTO field_count
  FROM template_fields
  WHERE template_id IN (SELECT id FROM task_templates WHERE company_id IS NULL AND slug = 'fire_drill_execution_documentation');
  
  RAISE NOTICE '✅ Template created successfully with % fields', field_count;
END $$;

commit;

