-- ============================================================================
-- Migration: Emergency Contact List Compliance Check Template
-- Description: Quarterly verification that emergency contact lists are displayed
--              correctly in all required locations
-- ============================================================================
-- Note: This migration will be skipped if required tables don't exist yet

DO $$
BEGIN
  -- Only proceed if required tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_templates')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_fields') THEN

    -- Clean up existing template if it exists (by slug)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'template_repeatable_labels') THEN
      DELETE FROM public.template_repeatable_labels
      WHERE template_id IN (
        SELECT id FROM public.task_templates
        WHERE company_id IS NULL
          AND slug = 'emergency_contact_list_compliance_check'
      );
    END IF;

    DELETE FROM public.template_fields
    WHERE template_id IN (
      SELECT id FROM public.task_templates
      WHERE company_id IS NULL
        AND slug = 'emergency_contact_list_compliance_check'
    );

    DELETE FROM public.task_templates
    WHERE company_id IS NULL
      AND slug = 'emergency_contact_list_compliance_check';

    -- Create the template
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
  is_active,
  evidence_types,
  instructions,
  repeatable_field_name,
  asset_type,
  requires_sop,
  triggers_contractor_on_failure,
  contractor_type
) VALUES (
  NULL, -- Global template available to all companies
  'Emergency Contact List Compliance Check',
  'emergency_contact_list_compliance_check',
  'Quarterly verification that emergency contact lists are displayed correctly in all required locations. Verify contact information is current, legible, and includes all required details. Update contacts via Organization → Emergency Contacts.',
  'h_and_s',
  'welfare_first_aid', -- Category: Health & Safety / Welfare & First Aid
  'monthly', -- Quarterly - using monthly frequency, scheduling handled via recurrence_pattern
  '09:00',
  ARRAY['before_open'],
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
  FALSE, -- Medium priority (not critical, but important)
  TRUE, -- Library template
  TRUE, -- Active
  ARRAY['yes_no_checklist', 'pass_fail', 'photo', 'text_note'], -- Yes/No checklist + Pass/Fail + Photos + Text notes
  'Verify that emergency contact lists are displayed in all required locations. Check that contact information is current, legible, and includes: first aider(s) with contact details, emergency services (999), manager/designated person contacts, utility emergency numbers. Ensure information is displayed in multiple languages if needed. Update contacts via Organization → Emergency Contacts if any information is outdated or missing.',
  NULL, -- NO asset selection (repeatable_field_name = NULL)
  NULL, -- No asset type filter
  FALSE, -- Does not require SOP
  FALSE, -- Does not trigger contractor
  NULL
);

-- ============================================================================
-- Template Fields
-- ============================================================================

    -- Inspection Information
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'inspection_date', 'date', 'Inspection Date', TRUE, 1,
      'Date when the emergency contact list compliance check was completed.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'emergency_contact_list_compliance_check';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'inspector_name', 'text', 'Inspector Name', TRUE, 2,
      'Name of the person conducting the emergency contact list compliance check.',
      'e.g., John Smith'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'emergency_contact_list_compliance_check';

-- Note: Yes/No checklist items come from default_checklist_items in recurrence_pattern above
-- They will appear as yes/no questions for each location

    -- Contact List Criteria (Yes/No questions)
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'first_aider_listed', 'pass_fail', 'First Aider(s) with Contact Details Listed', TRUE, 3,
      'YES: First aider(s) names and contact details are clearly listed. NO: First aider information is missing or incomplete.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'emergency_contact_list_compliance_check';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'emergency_services_listed', 'pass_fail', 'Emergency Services (999) Clearly Listed', TRUE, 4,
      'YES: Emergency services number (999) is clearly displayed. NO: Emergency services number is missing or not clearly visible.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'emergency_contact_list_compliance_check';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'manager_contacts_listed', 'pass_fail', 'Manager/Designated Person Contacts Listed', TRUE, 5,
      'YES: Manager or designated person contact details are listed. NO: Manager contacts are missing or incomplete.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'emergency_contact_list_compliance_check';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'utility_emergency_numbers_listed', 'pass_fail', 'Gas/Electric/Water Emergency Numbers Listed', TRUE, 6,
      'YES: Utility emergency numbers (gas, electric, water) are listed. NO: Utility emergency numbers are missing.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'emergency_contact_list_compliance_check';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'information_current_legible', 'pass_fail', 'CRITICAL: All Information Current and Legible', TRUE, 7,
      'YES: All contact information is current (up-to-date) and clearly legible. NO: Information is outdated, faded, or illegible.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'emergency_contact_list_compliance_check';

    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'multiple_languages_if_needed', 'pass_fail', 'CRITICAL: Multiple Languages if Needed', TRUE, 8,
      'YES: Contact lists are displayed in multiple languages if required by staff. NO: Only English is displayed when multiple languages are needed.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'emergency_contact_list_compliance_check';

    -- Overall Assessment
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'overall_assessment', 'pass_fail', 'Overall Assessment', TRUE, 9,
      'PASS: All locations have current, legible emergency contact lists with all required information. FAIL: One or more locations missing contact lists, information outdated, or required details missing.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'emergency_contact_list_compliance_check';

    -- Link to Emergency Contacts Page
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'contacts_updated', 'text', 'Contacts Updated via Organization Menu', FALSE, 10,
      'If contacts were updated, note the date and what was changed. Access: Organization → Emergency Contacts',
      'e.g., Updated first aider contact on 2024-01-15'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'emergency_contact_list_compliance_check';

    -- Corrective Actions
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'corrective_actions_taken', 'text', 'Corrective Actions Taken', FALSE, 11,
      'Document any corrective actions taken (e.g., replaced faded notice, updated contact information, added missing locations).',
      'e.g., Replaced faded notice in kitchen, updated manager contact number'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'emergency_contact_list_compliance_check';

    -- Notes
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
    SELECT id, 'inspection_notes', 'text', 'Additional Notes', FALSE, 12,
      'Any additional observations or notes from the inspection.',
      'e.g., Staff room notice board needs better protection from moisture'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'emergency_contact_list_compliance_check';

    -- Photo Evidence
    INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
    SELECT id, 'contact_list_photos', 'photo', 'Contact List Photos', FALSE, 13,
      'Upload photos showing the emergency contact lists displayed in each location.'
    FROM public.task_templates WHERE company_id IS NULL AND slug = 'emergency_contact_list_compliance_check';

    RAISE NOTICE 'Seeded emergency contact list compliance check template';

  ELSE
    RAISE NOTICE '⚠️ Required tables (task_templates, template_fields) do not exist yet - skipping emergency contact list template seed';
  END IF;
END $$;

