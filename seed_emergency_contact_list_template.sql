-- ============================================================================
-- Seed Emergency Contact List Compliance Check Template - Standalone Script
-- Description: Creates the emergency contact list compliance check template
-- Run this in Supabase SQL Editor if template hasn't seeded
-- ============================================================================

begin;

-- Clean up existing template if it exists
delete from template_repeatable_labels
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'emergency_contact_list_compliance_check'
);

delete from template_fields
where template_id in (
  select id from task_templates
  where company_id is null
    and slug = 'emergency_contact_list_compliance_check'
);

delete from task_templates
where company_id is null
  and slug = 'emergency_contact_list_compliance_check';

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
  'Emergency Contact List Compliance Check',
  'emergency_contact_list_compliance_check',
  'Quarterly verification that emergency contact lists are displayed correctly in all required locations. Verify contact information is current, legible, and includes all required details. Update contacts via Organization → Emergency Contacts.',
  'h_and_s',
  'welfare_first_aid',
  'monthly', -- Quarterly - using monthly frequency, scheduling handled via recurrence_pattern
  '09:00',
  array['before_open'],
  jsonb_build_object(
    'daypart_times', jsonb_build_object('before_open', '09:00'),
    'default_checklist_items', jsonb_build_array(
      'Main kitchen notice board: Emergency contact list present, clearly visible, and includes all required contacts (first aider, 999, manager, utilities)',
      'Staff room/break area: Emergency contact list present, clearly visible, and includes all required contacts (first aider, 999, manager, utilities)',
      'Office/reception: Emergency contact list present, clearly visible, and includes all required contacts (first aider, 999, manager, utilities)',
      'First aid station: Emergency contact list present, clearly visible, and includes all required contacts (first aider, 999, manager, utilities)',
      'Manager''s office: Emergency contact list present, clearly visible, and includes all required contacts (first aider, 999, manager, utilities)'
    ),
    'interval_months', 3 -- Quarterly: every 3 months
  ),
  'manager',
  'Health & Safety at Work Act 1974, Management of Health & Safety at Work Regulations 1999',
  false,
  true,
  true,
  array['yes_no_checklist', 'pass_fail', 'photo', 'text_note'],
  'Verify that emergency contact lists are displayed in all required locations. Check that contact information is current, legible, and includes: first aider(s) with contact details, emergency services (999), manager/designated person contacts, utility emergency numbers. Ensure information is displayed in multiple languages if needed. Update contacts via Organization → Emergency Contacts if any information is outdated or missing.',
  null, -- NO asset selection
  null,
  false,
  false,
  null
);

-- Add template fields (key fields)
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'inspection_date', 'date', 'Inspection Date', true, 1,
  'Date when the emergency contact list compliance check was completed.'
FROM task_templates WHERE company_id IS NULL AND slug = 'emergency_contact_list_compliance_check';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'first_aider_listed', 'pass_fail', 'First Aider(s) with Contact Details Listed', true, 3,
  'YES: First aider(s) names and contact details are clearly listed. NO: First aider information is missing or incomplete.'
FROM task_templates WHERE company_id IS NULL AND slug = 'emergency_contact_list_compliance_check';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'emergency_services_listed', 'pass_fail', 'Emergency Services (999) Clearly Listed', true, 4,
  'YES: Emergency services number (999) is clearly displayed. NO: Emergency services number is missing or not clearly visible.'
FROM task_templates WHERE company_id IS NULL AND slug = 'emergency_contact_list_compliance_check';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'information_current_legible', 'pass_fail', 'CRITICAL: All Information Current and Legible', true, 7,
  'YES: All contact information is current (up-to-date) and clearly legible. NO: Information is outdated, faded, or illegible.'
FROM task_templates WHERE company_id IS NULL AND slug = 'emergency_contact_list_compliance_check';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'overall_assessment', 'pass_fail', 'Overall Assessment', true, 9,
  'PASS: All locations have current, legible emergency contact lists with all required information. FAIL: One or more locations missing contact lists, information outdated, or required details missing.'
FROM task_templates WHERE company_id IS NULL AND slug = 'emergency_contact_list_compliance_check';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'contacts_updated', 'text', 'Contacts Updated via Organization Menu', false, 10,
  'If contacts were updated, note the date and what was changed. Access: Organization → Emergency Contacts',
  'e.g., Updated first aider contact on 2024-01-15'
FROM task_templates WHERE company_id IS NULL AND slug = 'emergency_contact_list_compliance_check';

INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'contact_list_photos', 'photo', 'Contact List Photos', false, 13,
  'Upload photos showing the emergency contact lists displayed in each location.'
FROM task_templates WHERE company_id IS NULL AND slug = 'emergency_contact_list_compliance_check';

-- Verify template was created
DO $$
DECLARE
  template_count INTEGER;
  field_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count
  FROM task_templates
  WHERE company_id IS NULL AND slug = 'emergency_contact_list_compliance_check';
  
  IF template_count = 0 THEN
    RAISE EXCEPTION 'Template creation failed!';
  END IF;
  
  SELECT COUNT(*) INTO field_count
  FROM template_fields
  WHERE template_id IN (SELECT id FROM task_templates WHERE company_id IS NULL AND slug = 'emergency_contact_list_compliance_check');
  
  RAISE NOTICE '✅ Template created successfully with % fields', field_count;
END $$;

commit;

