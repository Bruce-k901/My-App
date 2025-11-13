-- Seed Staff Sickness & Exclusion Log compliance template
-- This template is for logging staff illness, exclusions, and return-to-work clearance

-- First, delete any existing template with the same slug
DELETE FROM public.template_fields
WHERE template_id IN (
  SELECT id FROM public.task_templates 
  WHERE company_id IS NULL AND slug = 'staff_sickness_exclusion_log'
);

DELETE FROM public.task_templates 
WHERE company_id IS NULL AND slug = 'staff_sickness_exclusion_log';

-- Insert the template and get the ID
DO $$
DECLARE
  template_id_val UUID;
BEGIN
  -- Insert the template
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
    asset_type
  ) VALUES (
    NULL, -- Global template
    'Staff Sickness & Exclusion Log',
    'staff_sickness_exclusion_log',
    'Log and track staff illness, exclusions, and return-to-work clearance. Ensures compliance with food safety regulations requiring exclusion of symptomatic staff from food handling areas.',
    'food_safety',
    'food_safety',
    'triggered', -- As Occurs - triggered manually
    NULL,
    array[]::text[],
    jsonb_build_object(
      'daypart_times', jsonb_build_object(),
      'default_checklist_items', jsonb_build_array(
        '48-hour exclusion for vomiting/diarrhoea enforced',
        'Medical clearance for specific illnesses obtained',
        'Manager notified immediately',
        'Food handling restrictions applied',
        'CRITICAL: No symptomatic staff in food areas'
      )
    ),
    'manager',
    'Food Safety Act 1990, Food Hygiene Regulations 2013',
    true, -- High priority (Legal food safety requirement)
    true, -- Library template
    true, -- Active
    array['yes_no_checklist', 'text_note', 'photo'],
    'Record staff member details, illness onset date/time, symptoms, exclusion period, and return-to-work clearance. Verify compliance criteria including 48-hour exclusion enforcement, medical clearance, manager notification, food handling restrictions, and confirm no symptomatic staff were in food areas.',
    NULL, -- No asset selection
    NULL
  ) RETURNING id INTO template_id_val;
  
  -- Insert template fields
  INSERT INTO public.template_fields (template_id, field_name, field_type, label, required, field_order, help_text) VALUES
  -- Reporting Requirements Section
  (template_id_val, 'staff_member_name', 'text', 'Staff Member Name', true, 1, 'Full name of the staff member reporting illness'),
  (template_id_val, 'illness_onset_datetime', 'date', 'Date/Time of Illness Onset', true, 2, 'When did the illness symptoms first appear?'),
  (template_id_val, 'symptoms', 'textarea', 'Symptoms Described', true, 3, 'Detailed description of symptoms (e.g., vomiting, diarrhoea, fever, nausea)'),
  (template_id_val, 'exclusion_period_start', 'date', 'Exclusion Period Start Date', true, 4, 'Date when exclusion from food handling begins'),
  (template_id_val, 'exclusion_period_end', 'date', 'Exclusion Period End Date', false, 5, 'Expected or actual end date of exclusion period'),
  (template_id_val, 'return_to_work_date', 'date', 'Return-to-Work Clearance Date', false, 6, 'Date when medical clearance was received and staff can return'),
  
  -- Compliance Criteria Section (Note: Yes/No checklist items come from default_checklist_items in recurrence_pattern)
  -- These are handled by the yes_no_checklist evidence type
  
  -- Additional Information
  (template_id_val, 'additional_notes', 'textarea', 'Additional Notes', false, 7, 'Any additional information, actions taken, or follow-up required'),
  (template_id_val, 'supporting_documentation', 'photo', 'Supporting Documentation', false, 8, 'Photos of medical clearance documents, exclusion notices, or other relevant documentation');
  
END $$;

