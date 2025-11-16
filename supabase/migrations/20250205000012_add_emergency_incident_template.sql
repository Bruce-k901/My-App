-- ============================================================================
-- Migration: 20250205000012_add_emergency_incident_template.sql
-- Description: Emergency Incident Reporting Template - Creates reportable incidents with follow-up task generation
-- Special: This is a 'triggered' template that opens as a modal and generates follow-up tasks
-- ============================================================================

-- Clean up existing template if it exists
DELETE FROM template_repeatable_labels 
WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'emergency_incident_reporting');

DELETE FROM template_fields 
WHERE template_id IN (SELECT id FROM task_templates WHERE slug = 'emergency_incident_reporting');

DELETE FROM task_templates 
WHERE slug = 'emergency_incident_reporting';

-- Create emergency incident reporting template
INSERT INTO task_templates (
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
  repeatable_field_name,
  triggers_contractor_on_failure,
  contractor_type,
  is_active,
  requires_sop,
  requires_risk_assessment
) VALUES (
  NULL,
  'Emergency Incident Report',
  'emergency_incident_reporting',
  'Report workplace accidents, injuries, and near misses. Generates follow-up tasks and RIDDOR assessment.',
  'h_and_s',
  'health_safety',
  'triggered',  -- Special: Only created manually, not scheduled
  'anytime',
  ARRAY['anytime'],
  jsonb_build_object(
    'is_incident_template', TRUE,  -- Flag to identify this as an incident template
    'generates_followup_tasks', TRUE,  -- This template generates follow-up tasks
    'followup_task_options', jsonb_build_array(
      'update_risk_assessment',
      'review_update_sop',
      'management_investigation',
      'staff_safety_briefing',
      'equipment_maintenance_check',
      'insurance_notification',
      'contact_specific_person',
      'contact_specific_company'
    )
  ),
  'manager',
  'Health and Safety at Work Act 1974, RIDDOR 2013',
  TRUE,  -- Always critical
  TRUE,  -- Available in template library
  ARRAY['text_note', 'photo'],  -- Checklist + Photo evidence
  'EMERGENCY PROTOCOL:

1. IMMEDIATE RESPONSE:
   - If life-threatening: CALL 999 IMMEDIATELY
   - Provide first aid if trained and safe to do so
   - Preserve the scene - do not move anything unless necessary for safety
   - Secure the area to prevent further incidents

2. INCIDENT REPORTING:
   - Complete this form as soon as possible after the incident
   - Be accurate and detailed - this may be used for legal/insurance purposes
   - Include all witnesses and their contact information
   - Take photos of the scene if safe to do so

3. RIDDOR ASSESSMENT:
   - The system will automatically assess if this is RIDDOR reportable
   - Reportable incidents must be reported to HSE within specific timeframes:
     * Fatalities: Immediately
     * Major injuries: Within 10 days
     * Dangerous occurrences: Within 10 days
     * Injuries causing 7+ days absence: Within 15 days

4. FOLLOW-UP ACTIONS:
   - Select required follow-up tasks from the checklist
   - Each selected task will be added to Today''s Tasks feed
   - Complete follow-up tasks to prevent recurrence

5. REPORT GENERATION:
   - Once submitted, a downloadable report will be created
   - The report can be printed, shared, or archived
   - The incident will appear in the Incident Reports page',
  NULL,  -- No asset selection
  FALSE,  -- Not a contractor callout (different workflow)
  NULL,
  TRUE,
  FALSE,  -- No SOP upload in template
  FALSE   -- No RA upload in template
);

-- Add template fields for incident reporting

-- Incident Date & Time
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'incident_datetime', 'date', 'Incident Date & Time', TRUE, 1, 
  'Date and time when the incident occurred. Use the exact time if known.'
FROM task_templates WHERE slug = 'emergency_incident_reporting';

-- Incident Type
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
SELECT id, 'incident_type', 'select', 'Incident Type', TRUE, 2,
  'Select the type of incident that occurred.',
  jsonb_build_array(
    jsonb_build_object('value', 'slip_trip', 'label', 'Slip/Trip/Fall'),
    jsonb_build_object('value', 'cut', 'label', 'Cut/Laceration'),
    jsonb_build_object('value', 'burn', 'label', 'Burn/Scald'),
    jsonb_build_object('value', 'fall_from_height', 'label', 'Fall from Height'),
    jsonb_build_object('value', 'struck_by', 'label', 'Struck by Object'),
    jsonb_build_object('value', 'electrical', 'label', 'Electrical Shock'),
    jsonb_build_object('value', 'fire', 'label', 'Fire'),
    jsonb_build_object('value', 'food_poisoning', 'label', 'Food Poisoning/Illness'),
    jsonb_build_object('value', 'chemical', 'label', 'Chemical Exposure'),
    jsonb_build_object('value', 'manual_handling', 'label', 'Manual Handling Injury'),
    jsonb_build_object('value', 'other', 'label', 'Other')
  )
FROM task_templates WHERE slug = 'emergency_incident_reporting';

-- Severity
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, options)
SELECT id, 'severity', 'select', 'Incident Severity', TRUE, 3,
  'Select the severity level. This determines RIDDOR reporting requirements and follow-up actions.',
  jsonb_build_array(
    jsonb_build_object('value', 'near_miss', 'label', 'Near Miss (No injury)'),
    jsonb_build_object('value', 'minor', 'label', 'Minor (First aid only)'),
    jsonb_build_object('value', 'moderate', 'label', 'Moderate (Medical attention required)'),
    jsonb_build_object('value', 'major', 'label', 'Major (Hospital treatment)'),
    jsonb_build_object('value', 'critical', 'label', 'Critical (Life-threatening)'),
    jsonb_build_object('value', 'fatality', 'label', 'Fatality')
  )
FROM task_templates WHERE slug = 'emergency_incident_reporting';

-- Location
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'location', 'text', 'Location of Incident', TRUE, 4,
  'Exact location where the incident occurred (e.g., "Kitchen - Prep Area", "Main Dining Room - Table 12").',
  'e.g., Kitchen - Prep Area'
FROM task_templates WHERE slug = 'emergency_incident_reporting';

-- Description
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'incident_description', 'text', 'Detailed Description', TRUE, 5,
  'Provide a detailed description of what happened. Include: what was happening, what went wrong, immediate consequences.',
  'Describe the incident in detail...'
FROM task_templates WHERE slug = 'emergency_incident_reporting';

-- Emergency Services
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'emergency_services_called', 'pass_fail', 'Emergency Services Called', TRUE, 10,
  'PASS if emergency services (999) were called. FAIL if not called (but may be needed).'
FROM task_templates WHERE slug = 'emergency_incident_reporting';

-- First Aid Provided
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'first_aid_provided', 'pass_fail', 'First Aid Provided', TRUE, 11,
  'PASS if first aid was provided. FAIL if first aid was not provided (but may have been needed).'
FROM task_templates WHERE slug = 'emergency_incident_reporting';

-- Scene Preserved
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'scene_preserved', 'pass_fail', 'Scene Preserved', TRUE, 12,
  'PASS if the scene was preserved for investigation. FAIL if scene was disturbed before investigation.'
FROM task_templates WHERE slug = 'emergency_incident_reporting';

-- Immediate Actions
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text, placeholder)
SELECT id, 'immediate_actions', 'text', 'Immediate Actions Taken', TRUE, 13,
  'Describe any immediate actions taken to address the incident (e.g., first aid, scene secured, person taken to hospital).',
  'e.g., Applied pressure to wound, called ambulance, secured area...'
FROM task_templates WHERE slug = 'emergency_incident_reporting';

-- Reported By
INSERT INTO template_fields (template_id, field_name, field_type, label, required, field_order, help_text)
SELECT id, 'reported_by', 'text', 'Reported By (Name)', TRUE, 20,
  'Name of the person completing this incident report.'
FROM task_templates WHERE slug = 'emergency_incident_reporting';

-- Verification
DO $$
DECLARE
  template_record RECORD;
  field_count INTEGER;
BEGIN
  SELECT * INTO template_record
  FROM task_templates 
  WHERE slug = 'emergency_incident_reporting';
  
  SELECT COUNT(*) INTO field_count
  FROM template_fields
  WHERE template_id = template_record.id;
  
  IF template_record.id IS NOT NULL THEN
    RAISE NOTICE '✅ Emergency Incident Reporting template created successfully';
    RAISE NOTICE '   Template ID: %', template_record.id;
    RAISE NOTICE '   Category: %', template_record.category;
    RAISE NOTICE '   Frequency: % (triggered - manual creation only)', template_record.frequency;
    RAISE NOTICE '   Evidence types: %', template_record.evidence_types;
    RAISE NOTICE '   Template fields: %', field_count;
    RAISE NOTICE '   ✓ Features: Incident reporting, Photo evidence, Follow-up task generation';
    RAISE NOTICE '   ✓ Generates follow-up tasks: %', template_record.recurrence_pattern->>'generates_followup_tasks';
  ELSE
    RAISE WARNING '⚠️ Template creation failed. Template not found.';
  END IF;
END $$;









