-- ============================================================================
-- Migration: Emergency Contact List Compliance Check Template
-- Description: Quarterly verification that emergency contact lists are displayed
--              correctly in all required locations
-- ============================================================================

begin;

-- Clean up existing template if it exists (by slug)
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
  null, -- Global template available to all companies
  'Emergency Contact List Compliance Check',
  'emergency_contact_list_compliance_check',
  'Quarterly verification that emergency contact lists are displayed correctly in all required locations. Verify contact information is current, legible, and includes all required details. Update contacts via Organization → Emergency Contacts.',
  'h_and_s',
  'welfare_first_aid', -- Category: Health & Safety / Welfare & First Aid
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
  false, -- Medium priority (not critical, but important)
  true, -- Library template
  true, -- Active
  array['yes_no_checklist', 'pass_fail', 'photo', 'text_note'], -- Yes/No checklist + Pass/Fail + Photos + Text notes
  'Verify that emergency contact lists are displayed in all required locations. Check that contact information is current, legible, and includes: first aider(s) with contact details, emergency services (999), manager/designated person contacts, utility emergency numbers. Ensure information is displayed in multiple languages if needed. Update contacts via Organization → Emergency Contacts if any information is outdated or missing.',
  null, -- NO asset selection (repeatable_field_name = NULL)
  null, -- No asset type filter
  false, -- Does not require SOP
  false, -- Does not trigger contractor
  null
);

-- ============================================================================
-- Template Fields
-- ============================================================================

-- Inspection Information
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'inspection_date', 'date', 'Inspection Date', true, 1,
  'Date when the emergency contact list compliance check was completed.'
from task_templates where company_id is null and slug = 'emergency_contact_list_compliance_check';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'inspector_name', 'text', 'Inspector Name', true, 2,
  'Name of the person conducting the emergency contact list compliance check.',
  'e.g., John Smith'
from task_templates where company_id is null and slug = 'emergency_contact_list_compliance_check';

-- Note: Yes/No checklist items come from default_checklist_items in recurrence_pattern above
-- They will appear as yes/no questions for each location

-- Contact List Criteria (Yes/No questions)
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'first_aider_listed', 'pass_fail', 'First Aider(s) with Contact Details Listed', true, 3,
  'YES: First aider(s) names and contact details are clearly listed. NO: First aider information is missing or incomplete.'
from task_templates where company_id is null and slug = 'emergency_contact_list_compliance_check';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'emergency_services_listed', 'pass_fail', 'Emergency Services (999) Clearly Listed', true, 4,
  'YES: Emergency services number (999) is clearly displayed. NO: Emergency services number is missing or not clearly visible.'
from task_templates where company_id is null and slug = 'emergency_contact_list_compliance_check';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'manager_contacts_listed', 'pass_fail', 'Manager/Designated Person Contacts Listed', true, 5,
  'YES: Manager or designated person contact details are listed. NO: Manager contacts are missing or incomplete.'
from task_templates where company_id is null and slug = 'emergency_contact_list_compliance_check';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'utility_emergency_numbers_listed', 'pass_fail', 'Gas/Electric/Water Emergency Numbers Listed', true, 6,
  'YES: Utility emergency numbers (gas, electric, water) are listed. NO: Utility emergency numbers are missing.'
from task_templates where company_id is null and slug = 'emergency_contact_list_compliance_check';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'information_current_legible', 'pass_fail', 'CRITICAL: All Information Current and Legible', true, 7,
  'YES: All contact information is current (up-to-date) and clearly legible. NO: Information is outdated, faded, or illegible.'
from task_templates where company_id is null and slug = 'emergency_contact_list_compliance_check';

insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'multiple_languages_if_needed', 'pass_fail', 'CRITICAL: Multiple Languages if Needed', true, 8,
  'YES: Contact lists are displayed in multiple languages if required by staff. NO: Only English is displayed when multiple languages are needed.'
from task_templates where company_id is null and slug = 'emergency_contact_list_compliance_check';

-- Overall Assessment
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'overall_assessment', 'pass_fail', 'Overall Assessment', true, 9,
  'PASS: All locations have current, legible emergency contact lists with all required information. FAIL: One or more locations missing contact lists, information outdated, or required details missing.'
from task_templates where company_id is null and slug = 'emergency_contact_list_compliance_check';

-- Link to Emergency Contacts Page
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'contacts_updated', 'text', 'Contacts Updated via Organization Menu', false, 10,
  'If contacts were updated, note the date and what was changed. Access: Organization → Emergency Contacts',
  'e.g., Updated first aider contact on 2024-01-15'
from task_templates where company_id is null and slug = 'emergency_contact_list_compliance_check';

-- Corrective Actions
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'corrective_actions_taken', 'text', 'Corrective Actions Taken', false, 11,
  'Document any corrective actions taken (e.g., replaced faded notice, updated contact information, added missing locations).',
  'e.g., Replaced faded notice in kitchen, updated manager contact number'
from task_templates where company_id is null and slug = 'emergency_contact_list_compliance_check';

-- Notes
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
select id, 'inspection_notes', 'text', 'Additional Notes', false, 12,
  'Any additional observations or notes from the inspection.',
  'e.g., Staff room notice board needs better protection from moisture'
from task_templates where company_id is null and slug = 'emergency_contact_list_compliance_check';

-- Photo Evidence
insert into template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
select id, 'contact_list_photos', 'photo', 'Contact List Photos', false, 13,
  'Upload photos showing the emergency contact lists displayed in each location.'
from task_templates where company_id is null and slug = 'emergency_contact_list_compliance_check';

commit;

